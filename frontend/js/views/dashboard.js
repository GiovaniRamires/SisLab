// Dashboard — conteúdo varia conforme o perfil do usuário.
import { html, render, on, $ } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { session, firstName } from '../core/session.js';
import { errorState } from '../core/ui.js';
import { fmtDate, fmtRange, fmtRelativeDay, fmtTime, daysFromToday, plural } from '../core/format.js';
import { laboratorios } from '../services/laboratorios.js';
import { reservas, alocacoes, situacao } from '../services/reservas.js';
import { turmas } from '../services/turmas.js';
import { usuarios } from '../services/usuarios.js';
import { statCard, reservaBadge, callout, skeletonStats, skeletonRows } from '../components/common.js';

const reservaRow = (r) => html`
  <a class="list-row" href="#/reservas/${r.id}">
    <div class="grow">
      <p class="list-title">${r.disciplina}</p>
      <p class="list-meta">${fmtDate(r.data)} · ${fmtRange(r.horaInicio, r.horaFim)} · ${r.laboratorioNome}${session.isAdmin ? html` · ${r.docenteNome}` : ''}</p>
    </div>
    ${reservaBadge(r)}
  </a>`;

const reservasCard = (list, title = 'Minhas reservas', empty = 'Nenhuma reserva agendada.') => html`
  <div class="card mt-20">
    <div class="card-header"><h2 class="card-title">${title}</h2><a class="btn btn-link" href="#/reservas">Ver todas ${icon('arrowRight')}</a></div>
    ${list.length ? list.map(reservaRow) : html`<div class="card-body muted text-sm">${empty}</div>`}
  </div>`;

function labAlerts(labs) {
  return labs.flatMap((l) => {
    if (l.total && !l.ativos) return [callout({ tone: 'danger', title: `${l.nome} indisponível`, text: 'Nenhum computador ativo no momento.' })];
    if (l.manutencao || l.desativados) {
      const parts = [];
      if (l.manutencao) parts.push(plural(l.manutencao, 'computador em manutenção', 'computadores em manutenção'));
      if (l.desativados) parts.push(plural(l.desativados, 'desativado', 'desativados'));
      return [callout({ tone: 'warning', title: `${l.nome}: ${l.manutencao ? 'manutenção' : 'máquinas desativadas'}`, text: `${parts.join(' e ')}. ${l.ativos} de ${l.total} estações disponíveis.` })];
    }
    return [];
  });
}

/* ===================== Docente ===================== */
async function docente(root) {
  render(root, html`<div class="page">${skeletonStats()}<div class="mt-20">${skeletonRows(3)}</div></div>`);
  const [labs, minhasTurmas, todas] = await Promise.all([
    laboratorios.listarComResumo(),
    turmas.listar().catch(() => []),
    reservas.listar(),
  ]);
  const proximas = todas.filter((r) => ['AGENDADA', 'EM_ANDAMENTO'].includes(situacao(r)));
  const prox = proximas[0];
  const labsDisp = labs.filter((l) => l.ativos > 0).length;
  const totalAlunos = new Set(minhasTurmas.flatMap((t) => t.alunos.map((a) => a.id))).size;
  const labProx = prox && labs.find((l) => l.id === prox.laboratorioId);

  render(root, html`
    <div class="page">
      <div class="grid grid-4">
        ${statCard({ label: 'Próxima aula', value: prox ? prox.laboratorioNome.replace('Laboratório', 'Lab') : '—', hint: prox ? `${fmtRelativeDay(prox.data, { withDate: false })} — ${fmtTime(prox.horaInicio)}` : 'Sem aulas agendadas', tone: 'primary' })}
        ${statCard({ label: 'Reservas ativas', value: String(proximas.length).padStart(2, '0'), hint: 'Agendadas', tone: 'success' })}
        ${statCard({ label: 'Labs disponíveis', value: String(labsDisp).padStart(2, '0'), hint: 'Agora', tone: 'success' })}
        ${statCard({ label: 'Alunos', value: String(totalAlunos).padStart(2, '0'), hint: plural(minhasTurmas.length, 'turma', 'turmas') })}
      </div>

      <div class="grid grid-main-aside mt-24">
        <div class="card card-pad">
          ${prox ? html`
            <div class="row between start">
              <div>
                <h2 class="card-title">Próxima aula</h2>
                <div class="mt-12">${reservaBadge(prox)}</div>
              </div>
              <span class="text-xs subtle">${fmtRelativeDay(prox.data)}</span>
            </div>
            <div class="mt-20">
              <p class="kv-label">Disciplina</p>
              <p class="text-lg fw-700 mt-4">${prox.disciplina}</p>
            </div>
            <div class="kv-grid mt-20">
              <div><p class="kv-label">Turma</p><p class="kv-value">${prox.turmaNome}</p></div>
              <div><p class="kv-label">Horário</p><p class="kv-value">${fmtTime(prox.horaInicio)} — ${fmtTime(prox.horaFim)}</p></div>
              <div><p class="kv-label">Laboratório</p><p class="kv-value">${prox.laboratorioNome} · ${prox.bloco}</p></div>
              <div><p class="kv-label">Computadores</p><p class="kv-value">${labProx ? plural(labProx.ativos, 'estação ativa', 'estações ativas') : '—'}</p></div>
            </div>
            <hr class="divider">
            <a class="btn btn-primary" href="#/reservas/${prox.id}">Ver alocação</a>`
          : html`
            <h2 class="card-title">Próxima aula</h2>
            <div class="empty" style="padding:32px 8px 16px">
              <div class="empty-icon">${icon('calendar')}</div>
              <div class="empty-title">Nenhuma aula agendada</div>
              <p class="empty-text">Reserve um laboratório para sua próxima aula prática.</p>
              <a class="btn btn-primary" href="#/reservar">${icon('plus')} Reservar laboratório</a>
            </div>`}
        </div>

        <div class="stack" style="--gap:16px">
          <div class="card card-pad-sm">
            <h2 class="card-title" style="font-size:14px">Ações rápidas</h2>
            <div class="stack mt-16" style="--gap:8px">
              <a class="btn btn-primary btn-block" style="justify-content:flex-start;height:40px" href="#/reservar">${icon('plus')} Reservar laboratório</a>
              <a class="btn btn-soft btn-block" style="justify-content:flex-start;height:40px" href="#/grade">${icon('grid')} Consultar grade</a>
              <a class="btn btn-soft btn-block" style="justify-content:flex-start;height:40px" href="#/reservas">${icon('list')} Minhas reservas</a>
            </div>
          </div>
          <div data-pendentes></div>
          ${labAlerts(labs)}
        </div>
      </div>

      ${reservasCard(proximas.slice(0, 5))}
    </div>`);

  // Alunos sem alocação na próxima aula (carregado em segundo plano)
  if (prox) {
    Promise.all([alocacoes.listar(prox.id), turmas.buscar(prox.turmaId)]).then(([aloc, turma]) => {
      const pend = turma.alunos.length - aloc.length;
      const el = $('[data-pendentes]', root);
      if (el && pend > 0) {
        render(el, html`<a href="#/reservas/${prox.id}" style="text-decoration:none;display:block">${callout({ tone: 'info', title: `${plural(pend, 'aluno sem alocação', 'alunos sem alocação')}`, text: `Turma ${prox.turmaNome} — aula ${fmtRelativeDay(prox.data, { withDate: false }).toLowerCase()}.` })}</a>`);
      }
    }).catch(() => {});
  }
}

/* ===================== Administrador ===================== */
async function admin(root) {
  render(root, html`<div class="page">${skeletonStats()}<div class="mt-20">${skeletonRows(4)}</div></div>`);
  const [labs, users, listaTurmas, todas] = await Promise.all([
    laboratorios.listarComResumo(),
    usuarios.listarTodos(),
    turmas.listar().catch(() => []),
    reservas.listar().catch(() => []),
  ]);
  const totalPcs = labs.reduce((s, l) => s + l.total, 0);
  const ativos = labs.reduce((s, l) => s + l.ativos, 0);
  const proximas = todas.filter((r) => ['AGENDADA', 'EM_ANDAMENTO'].includes(situacao(r)));
  const hoje = proximas.filter((r) => daysFromToday(r.data) === 0);
  const count = (p) => users.filter((u) => u.perfil === p).length;

  render(root, html`
    <div class="page">
      <div class="page-header" style="margin-top:0">
        <div><h1 class="page-title">Painel administrativo</h1><p class="page-subtitle">Visão geral dos laboratórios, máquinas e reservas.</p></div>
      </div>
      <div class="grid grid-4">
        ${statCard({ label: 'Laboratórios', value: String(labs.length).padStart(2, '0'), hint: `${labs.filter((l) => l.ativos).length} com máquinas ativas`, tone: 'primary' })}
        ${statCard({ label: 'Computadores ativos', value: html`${ativos}<span style="font-size:15px;color:var(--subtle);font-weight:600">/${totalPcs}</span>`, hint: `${totalPcs - ativos} indisponíveis`, tone: 'success' })}
        ${statCard({ label: 'Usuários', value: String(users.length).padStart(2, '0'), hint: `${count('DOCENTE')} docentes · ${count('DISCENTE')} discentes` })}
        ${statCard({ label: 'Reservas agendadas', value: String(proximas.length).padStart(2, '0'), hint: `${hoje.length} hoje · ${listaTurmas.length} turmas` })}
      </div>

      <div class="grid grid-main-aside mt-24">
        <div class="card">
          <div class="card-header"><h2 class="card-title">Situação dos laboratórios</h2><a class="btn btn-link" href="#/laboratorios">Gerenciar ${icon('arrowRight')}</a></div>
          ${labs.length ? labs.map((l) => {
            const pct = l.total ? Math.round((l.ativos / l.total) * 100) : 0;
            return html`
              <a class="list-row" href="#/laboratorios/${l.id}">
                <div class="grow">
                  <p class="list-title">${l.nome} <span class="subtle fw-500" style="font-size:12px">· ${l.bloco}</span></p>
                  <div class="row mt-8" style="gap:12px">
                    <div class="progress success grow" style="max-width:260px"><span style="width:${pct}%"></span></div>
                    <span class="text-xs muted nowrap">${l.ativos}/${l.total} ativos</span>
                  </div>
                </div>
                ${!l.total ? html`<span class="badge badge-neutral">Sem máquinas</span>`
                  : !l.ativos ? html`<span class="badge badge-danger dot">Indisponível</span>`
                  : l.manutencao ? html`<span class="badge badge-warning dot">Manutenção</span>`
                  : html`<span class="badge badge-success dot">Operacional</span>`}
              </a>`;
          }) : html`<div class="card-body muted text-sm">Nenhum laboratório cadastrado. <a href="#/laboratorios?novo=1">Cadastrar agora</a></div>`}
        </div>

        <div class="stack" style="--gap:16px">
          <div class="card card-pad-sm">
            <h2 class="card-title" style="font-size:14px">Ações rápidas</h2>
            <div class="stack mt-16" style="--gap:8px">
              <a class="btn btn-primary btn-block" style="justify-content:flex-start;height:40px" href="#/laboratorios?novo=1">${icon('plus')} Novo laboratório</a>
              <a class="btn btn-soft btn-block" style="justify-content:flex-start;height:40px" href="#/computadores?novo=1">${icon('monitor')} Cadastrar computadores</a>
              <a class="btn btn-soft btn-block" style="justify-content:flex-start;height:40px" href="#/usuarios?novo=1">${icon('userPlus')} Novo usuário</a>
              <a class="btn btn-soft btn-block" style="justify-content:flex-start;height:40px" href="#/turmas?novo=1">${icon('users')} Nova turma</a>
            </div>
          </div>
          ${labAlerts(labs)}
        </div>
      </div>

      ${reservasCard(proximas.slice(0, 6), 'Próximas reservas', 'Nenhuma reserva agendada pelos docentes.')}
    </div>`);
}

/* ===================== Discente ===================== */
async function discente(root) {
  render(root, html`<div class="page">${skeletonStats(3)}</div>`);
  const labs = await laboratorios.listarComResumo();
  const ativos = labs.reduce((s, l) => s + l.ativos, 0);
  const manut = labs.reduce((s, l) => s + l.manutencao, 0);
  render(root, html`
    <div class="page">
      <div class="page-header" style="margin-top:0">
        <div><h1 class="page-title">Olá, ${firstName(session.user.nome)}!</h1><p class="page-subtitle">Consulte os laboratórios e a disponibilidade das máquinas.</p></div>
      </div>
      <div class="grid grid-3">
        ${statCard({ label: 'Laboratórios', value: String(labs.length).padStart(2, '0'), hint: 'Cadastrados', tone: 'primary' })}
        ${statCard({ label: 'Computadores disponíveis', value: String(ativos).padStart(2, '0'), hint: 'Ativos agora', tone: 'success' })}
        ${statCard({ label: 'Em manutenção', value: String(manut).padStart(2, '0'), hint: 'Temporariamente indisponíveis', tone: manut ? 'warning' : '' })}
      </div>
      <div class="mt-20">${callout({ tone: 'info', title: 'Como funcionam as reservas?', text: 'As reservas de laboratório são feitas pelos docentes para cada turma. No dia da aula, seu professor indicará a estação em que você ficará.' })}</div>
      <div class="card mt-20">
        <div class="card-header"><h2 class="card-title">Laboratórios</h2><a class="btn btn-link" href="#/laboratorios">Ver todos ${icon('arrowRight')}</a></div>
        ${labs.length ? labs.map((l) => html`
          <a class="list-row" href="#/laboratorios/${l.id}">
            <div><p class="list-title">${l.nome}</p><p class="list-meta">${l.bloco} · ${plural(l.total, 'computador', 'computadores')}</p></div>
            <span class="badge ${l.ativos ? 'badge-success' : 'badge-danger'} dot">${l.ativos} disponíveis</span>
          </a>`) : html`<div class="card-body muted text-sm">Nenhum laboratório cadastrado.</div>`}
      </div>
    </div>`);
}

export default async function dashboard(ctx) {
  const { root } = ctx;
  const load = async () => {
    try {
      if (session.isAdmin) await admin(root);
      else if (session.isDocente) await docente(root);
      else await discente(root);
    } catch (err) {
      if (ctx.isCurrent()) render(root, html`<div class="page">${errorState(err)}</div>`);
    }
  };
  on(root, 'click', '[data-action=retry]', load);
  await load();
}
