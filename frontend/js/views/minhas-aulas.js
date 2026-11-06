// Telas exclusivas do discente: lista das próprias aulas futuras e o mapa do laboratório
// com destaque da máquina do próprio aluno ("você está aqui").
import { html, render, on } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { errorState, emptyState, loadingBlock } from '../core/ui.js';
import { fmtDate, fmtRange, fmtRelativeDay, fmtTime } from '../core/format.js';
import { aluno } from '../services/aluno.js';
import { PC_STATUS } from '../services/laboratorios.js';
import { pageHeader, labMap } from '../components/common.js';

/* ===================== Lista de aulas do discente ===================== */
export async function minhasAulas(ctx) {
  const { root } = ctx;
  const header = pageHeader({ title: 'Minhas aulas', subtitle: 'Suas próximas aulas e onde você vai sentar.' });

  async function load() {
    render(root, html`<div class="page">${header}${loadingBlock('Carregando suas aulas...')}</div>`);
    try {
      const reservas = await aluno.minhasReservas();
      if (!ctx.isCurrent()) return;
      render(root, html`
        <div class="page">
          ${header}
          ${reservas.length ? html`
            <div class="stack" style="--gap:14px">
              ${reservas.map((r) => html`
                <a class="card interactive" href="#/minhas-aulas/${r.laboratorioId}?reserva=${r.reservaId}" style="display:block;text-decoration:none;color:inherit">
                  <div style="padding:18px 22px">
                    <div class="row between start">
                      <div>
                        <p class="list-title" style="font-size:15px">${r.disciplina}</p>
                        <p class="list-meta mt-4">${r.turma} · Prof(a). ${r.docenteNome}</p>
                      </div>
                      <span class="badge badge-success dot">Confirmada</span>
                    </div>
                    <div class="kv-grid mt-16">
                      <div><p class="kv-label">Data</p><p class="kv-value">${fmtDate(r.data)} <span class="subtle">(${fmtRelativeDay(r.data, { withDate: false })})</span></p></div>
                      <div><p class="kv-label">Horário</p><p class="kv-value">${fmtRange(r.horaInicio, r.horaFim)}</p></div>
                      <div><p class="kv-label">Laboratório</p><p class="kv-value">${r.laboratorioNome} · ${r.bloco}</p></div>
                      <div><p class="kv-label">Seu computador</p><p class="kv-value" style="color:var(--primary);font-weight:700">${icon('monitor')} ${r.maquinaIdentificador}</p></div>
                    </div>
                  </div>
                </a>`)}
            </div>`
          : html`<div class="card">${emptyState({ iconName: 'calendar', title: 'Você não tem aulas agendadas', text: 'Quando seu professor reservar um laboratório e alocar você em uma máquina, suas aulas aparecerão aqui.' })}</div>`}
        </div>`);
    } catch (err) {
      render(root, html`<div class="page">${header}<div class="card">${errorState(err)}</div></div>`);
    }
  }
  on(root, 'click', '[data-action=retry]', load);
  await load();
}

/* ===================== Mapa do laboratório para o discente ===================== */
export async function minhaAulaMapa(ctx) {
  const { root, params, query } = ctx;
  const labId = params.id;
  const back = { href: '/minhas-aulas', label: 'Minhas aulas' };

  async function load() {
    render(root, html`<div class="page">${loadingBlock('Carregando o laboratório...')}</div>`);
    try {
      const [mapa, reservas] = await Promise.all([
        aluno.mapaLaboratorio(labId),
        aluno.minhasReservas().catch(() => []),
      ]);
      if (!ctx.isCurrent()) return;
      const reservaId = query.get('reserva');
      const minha = reservas.find((r) => String(r.laboratorioId) === String(labId) && (!reservaId || String(r.reservaId) === String(reservaId)))
        || reservas.find((r) => String(r.laboratorioId) === String(labId));
      const minhaMaquina = minha?.maquinaIdentificador;

      render(root, html`
        <div class="page">
          ${pageHeader({
            title: minha ? minha.laboratorioNome : 'Laboratório',
            subtitle: minha ? html`${minha.disciplina} · ${fmtDate(minha.data)} · ${fmtRange(minha.horaInicio, minha.horaFim)}` : '',
            back,
          })}
          ${minha ? html`
            <div class="summary-strip">
              <div><p class="kv-label">Disciplina</p><p class="kv-value">${minha.disciplina}</p></div>
              <div><p class="kv-label">Horário</p><p class="kv-value">${fmtTime(minha.horaInicio)} — ${fmtTime(minha.horaFim)}</p></div>
              <div><p class="kv-label">Laboratório</p><p class="kv-value">${minha.laboratorioNome} · ${minha.bloco}</p></div>
              <div><p class="kv-label">Seu computador</p><p class="kv-value" style="color:var(--primary);font-weight:700">${minhaMaquina}</p></div>
            </div>` : ''}
          <div class="card mt-20">
            <div class="card-header flat"><div><h2 class="card-title">Mapa do laboratório</h2><p class="card-subtitle">A estação destacada em azul é a sua.</p></div></div>
            ${labMap(mapa, (pc) => {
              const ehMinha = minhaMaquina && pc.identificador === minhaMaquina;
              if (ehMinha) return { cls: 'allocated', sub: 'Você', title: `${pc.identificador} — seu lugar`, pulse: true };
              const s = PC_STATUS[pc.status] || { cls: '', map: pc.status };
              return { cls: s.cls, sub: s.map };
            })}
            <div class="row" style="padding:0 20px 16px"><span class="badge badge-info dot" style="margin-top:4px">${icon('mapPin')} Você está aqui: ${minhaMaquina || '—'}</span></div>
          </div>
          <div class="mt-20"><a class="btn btn-back" href="#/minhas-aulas">${icon('arrowLeft')} Voltar</a></div>
        </div>`);
    } catch (err) {
      const e = err.status === 403 ? { status: 403, message: 'Você não tem aula neste laboratório.' } : err;
      render(root, html`<div class="page">${pageHeader({ title: 'Laboratório', back })}<div class="card">${errorState(e)}</div></div>`);
    }
  }
  on(root, 'click', '[data-action=retry]', load);
  await load();
}
