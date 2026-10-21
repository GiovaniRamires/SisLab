// Lista de reservas — Docente: as próprias | Administrador: todas.
import { html, render, on, $, debounce } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { session } from '../core/session.js';
import { navigate } from '../core/router.js';
import { errorState, emptyState } from '../core/ui.js';
import { fmtDate, fmtRange, fmtRelativeDay, normalize, daysFromToday } from '../core/format.js';
import { reservas, situacao } from '../services/reservas.js';
import { invalidate } from '../services/cache.js';
import { pageHeader, reservaBadge, skeletonRows } from '../components/common.js';

const state = { aba: 'proximas', busca: '', lab: '' };

export default async function reservasList(ctx) {
  const { root } = ctx;
  const admin = session.isAdmin;
  let lista = [];

  const header = pageHeader({
    title: admin ? 'Reservas' : 'Minhas reservas',
    subtitle: admin ? 'Todas as reservas de laboratório realizadas pelos docentes.' : 'Acompanhe suas reservas de laboratório e a alocação dos alunos.',
    actions: html`
      <button class="btn btn-secondary" data-action="reload" title="Atualizar">${icon('refresh')}</button>
      ${!admin ? html`<a class="btn btn-primary" href="#/reservar">${icon('plus')} Nova reserva</a>` : ''}`,
  });

  function filtrar() {
    return lista.filter((r) => {
      const s = situacao(r);
      if (state.aba === 'proximas' && !['AGENDADA', 'EM_ANDAMENTO'].includes(s)) return false;
      if (state.aba === 'realizadas' && s !== 'ENCERRADA') return false;
      if (state.lab && String(r.laboratorioId) !== state.lab) return false;
      if (state.busca) {
        const q = normalize(state.busca);
        return [r.disciplina, r.turmaNome, r.laboratorioNome, r.docenteNome, r.justificativa, `#${r.id}`].some((v) => normalize(v).includes(q));
      }
      return true;
    });
  }

  function paintTable() {
    const itens = filtrar();
    if (state.aba === 'realizadas') itens.reverse();
    const el = $('[data-table]', root);
    if (!itens.length) {
      render(el, emptyState({
        iconName: 'calendar',
        title: lista.length ? 'Nenhuma reserva encontrada' : 'Nenhuma reserva ainda',
        text: lista.length ? 'Ajuste os filtros para ver outras reservas.' : admin ? 'Quando os docentes reservarem laboratórios, elas aparecerão aqui.' : 'Reserve um laboratório para sua próxima aula prática.',
        action: !lista.length && !admin ? html`<a class="btn btn-primary" href="#/reservar">${icon('plus')} Reservar laboratório</a>` : '',
      }));
      return;
    }
    render(el, html`
      <div class="table-wrap">
        <table class="table">
          <thead><tr>
            <th>Data</th><th>Horário</th><th>Disciplina / Turma</th><th>Laboratório</th>${admin ? html`<th>Docente</th>` : ''}<th>Status</th><th class="sr-only">Abrir</th>
          </tr></thead>
          <tbody>
            ${itens.map((r) => html`
              <tr class="clickable" data-href="/reservas/${r.id}" tabindex="0">
                <td class="nowrap"><span class="fw-600" style="color:var(--text)">${fmtDate(r.data)}</span><br><span class="text-xs subtle">${Math.abs(daysFromToday(r.data)) <= 1 ? fmtRelativeDay(r.data, { withDate: false }) : fmtRelativeDay(r.data).split(',')[0]}</span></td>
                <td class="nowrap mono text-sm">${fmtRange(r.horaInicio, r.horaFim)}</td>
                <td><span class="fw-500" style="color:var(--text)">${r.disciplina}</span><br><span class="text-xs subtle">${r.turmaNome}</span></td>
                <td class="nowrap">${r.laboratorioNome}<br><span class="text-xs subtle">${r.bloco}</span></td>
                ${admin ? html`<td>${r.docenteNome}</td>` : ''}
                <td>${reservaBadge(r)}</td>
                <td class="right subtle">${icon('chevronRight')}</td>
              </tr>`)}
          </tbody>
        </table>
      </div>`);
  }

  function paint() {
    const labs = [...new Map(lista.map((r) => [r.laboratorioId, r.laboratorioNome])).entries()];
    const counts = {
      proximas: lista.filter((r) => ['AGENDADA', 'EM_ANDAMENTO'].includes(situacao(r))).length,
      realizadas: lista.filter((r) => situacao(r) === 'ENCERRADA').length,
      todas: lista.length,
    };
    render(root, html`
      <div class="page wide">
        ${header}
        <div class="card">
          <div class="tabs" role="tablist">
            ${[['proximas', 'Próximas'], ['realizadas', 'Realizadas'], ['todas', 'Todas']].map(([k, label]) => html`
              <button class="tab ${state.aba === k ? 'active' : ''}" role="tab" aria-selected="${state.aba === k}" data-aba="${k}">${label} <span class="badge ${state.aba === k ? 'badge-info' : 'badge-neutral'}">${counts[k]}</span></button>`)}
          </div>
          <div class="row wrap" style="padding:16px 24px;border-bottom:1px solid var(--border);gap:12px">
            <div class="input-icon grow" style="min-width:220px">${icon('search')}<input class="input input-sm" type="search" placeholder="Buscar por disciplina, turma, laboratório${admin ? ', docente' : ''}..." value="${state.busca}" data-busca aria-label="Buscar"></div>
            <select class="select input-sm" style="width:auto;min-width:200px" data-lab aria-label="Filtrar por laboratório">
              <option value="">Todos os laboratórios</option>
              ${labs.map(([id, nome]) => html`<option value="${id}" ${String(id) === state.lab ? 'selected' : ''}>${nome}</option>`)}
            </select>
          </div>
          <div data-table></div>
        </div>
      </div>`);
    paintTable();
  }

  async function load(force = false) {
    if (force) invalidate('reservas');
    render(root, html`<div class="page wide">${header}${skeletonRows(5)}</div>`);
    try {
      lista = await reservas.listar();
      if (ctx.isCurrent()) paint();
    } catch (err) {
      render(root, html`<div class="page wide">${header}<div class="card">${errorState(err)}</div></div>`);
    }
  }

  on(root, 'click', '[data-action=retry]', () => load(true));
  on(root, 'click', '[data-action=reload]', () => load(true));
  on(root, 'click', '[data-aba]', (e, el) => { state.aba = el.dataset.aba; paint(); });
  on(root, 'change', '[data-lab]', (e, el) => { state.lab = el.value; paintTable(); });
  on(root, 'input', '[data-busca]', debounce((e) => { state.busca = e.target.value; paintTable(); }, 150));
  on(root, 'click', 'tr[data-href]', (e, el) => navigate(el.dataset.href));
  on(root, 'keydown', 'tr[data-href]', (e, el) => { if (e.key === 'Enter') navigate(el.dataset.href); });

  await load();
}
