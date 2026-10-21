// Detalhe da reserva + Mapa e alocação de alunos nas estações.
import { html, render, on, $ } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { session } from '../core/session.js';
import { toast, showError, confirmDialog, loadingBlock, errorState } from '../core/ui.js';
import { fmtDate, fmtRange, fmtRelativeDay, naturalCompare, plural } from '../core/format.js';
import { reservas, alocacoes, situacao } from '../services/reservas.js';
import { computadores, PC_STATUS } from '../services/laboratorios.js';
import { turmas } from '../services/turmas.js';
import { invalidate } from '../services/cache.js';
import { pageHeader, reservaBadge, callout, labMap, stepper } from '../components/common.js';

export default async function reservaDetalhe(ctx) {
  const { root, params, query } = ctx;
  const id = params.id;
  let reserva, pcs = [], alunos = [], aloc = { disponivel: false, itens: [] };
  let modo = 'manual';
  let selAluno = null;
  let busy = false;

  const isDono = () => session.isDocente && reserva && String(reserva.docenteId) === String(session.user.id);
  const podeAlocar = () => isDono() && aloc.disponivel && situacao(reserva) !== 'CANCELADA';

  async function load() {
    render(root, html`<div class="page">${loadingBlock('Carregando reserva...')}</div>`);
    try {
      reserva = await reservas.buscar(id);
      invalidate('pcs', `turmas:${reserva.turmaId}`);
      const [listaPcs, turma, al] = await Promise.all([
        computadores.porLaboratorio(reserva.laboratorioId),
        turmas.buscar(reserva.turmaId).catch(() => null),
        alocacoes.listar(id),
      ]);
      pcs = listaPcs;
      alunos = (turma?.alunos || []).slice().sort((a, b) => naturalCompare(a.nome, b.nome));
      aloc = al;
      if (ctx.isCurrent()) paint();
    } catch (err) {
      const msg = err.status === 404 ? { ...err, message: 'Reserva não encontrada.' } : err.status === 403 ? { ...err, message: 'Esta reserva pertence a outro docente.' } : err;
      render(root, html`<div class="page">${pageHeader({ title: 'Reserva', back: { href: '/reservas', label: 'Reservas' } })}<div class="card">${errorState(msg)}</div></div>`);
    }
  }

  const alocadoPorPc = () => new Map(aloc.itens.map((a) => [a.maquinaId, a]));
  const alocadoPorAluno = () => new Map(aloc.itens.map((a) => [a.alunoId, a]));

  function pcState(pc, porPc) {
    const a = porPc.get(pc.id);
    if (a) return { cls: 'allocated', sub: a.alunoNome.split(' ')[0], title: `${pc.identificador} — ${a.alunoNome}` };
    if (pc.status !== 'ATIVO') return { cls: PC_STATUS[pc.status].cls, sub: PC_STATUS[pc.status].map };
    const clickable = podeAlocar() && modo === 'manual' && !!selAluno;
    return { cls: '', sub: 'Disponível', clickable, pulse: clickable, title: clickable ? `Alocar ${selAluno.nome} em ${pc.identificador}` : pc.identificador };
  }

  function paint() {
    const porPc = alocadoPorPc();
    const porAluno = alocadoPorAluno();
    const ativos = pcs.filter((p) => p.status === 'ATIVO');
    const livres = ativos.filter((p) => !porPc.has(p.id));
    const pendentes = alunos.filter((a) => !porAluno.has(a.id));
    const total = alunos.length;
    const pct = total ? Math.round((aloc.itens.length / total) * 100) : 0;
    const sit = situacao(reserva);
    const nova = query.get('nova') === '1';
    if (selAluno && porAluno.has(selAluno.id)) selAluno = null;

    render(root, html`
      <div class="page">
        ${pageHeader({
          title: html`${reserva.laboratorioNome} — Alocação de alunos`,
          subtitle: html`${reserva.disciplina} · ${fmtRelativeDay(reserva.data)} · ${fmtRange(reserva.horaInicio, reserva.horaFim)}`,
          back: { href: '/reservas', label: session.isAdmin ? 'Reservas' : 'Minhas reservas' },
          actions: html`${reservaBadge(reserva)}<span class="badge badge-neutral mono">#${reserva.id}</span>`,
        })}
        ${nova ? html`<div class="mb-16">${stepper(['Data e horário', 'Escolher laboratório', 'Mapa e alocação'], 3)}</div>` : ''}

        <div class="summary-strip">
          <div><p class="kv-label">Laboratório</p><p class="kv-value">${reserva.laboratorioNome.replace(/^Laborat[óo]rio\s*/i, '') || reserva.laboratorioNome}</p></div>
          <div><p class="kv-label">Data</p><p class="kv-value">${fmtDate(reserva.data)}</p></div>
          <div><p class="kv-label">Horário</p><p class="kv-value">${fmtRange(reserva.horaInicio, reserva.horaFim)}</p></div>
          <div><p class="kv-label">Turma</p><p class="kv-value">${reserva.turmaNome}</p></div>
          <div><p class="kv-label">Alunos</p><p class="kv-value">${total}</p></div>
          <div><p class="kv-label">Estações disp.</p><p class="kv-value">${livres.length}/${pcs.length}</p></div>
        </div>

        ${!aloc.disponivel ? html`<div class="mt-16">${callout({ tone: 'neutral', iconName: 'info', title: 'Módulo de alocação indisponível no servidor', text: html`O backend em execução ainda não possui o endpoint <code>/reserva/{id}/alocacoes</code> (PR “feature/alocacao”). O mapa abaixo mostra apenas o status das máquinas.` })}</div>`
          : session.isAdmin ? html`<div class="mt-16">${callout({ tone: 'info', title: 'Visualização administrativa', text: 'Apenas o docente responsável pela reserva pode alocar os alunos.' })}</div>`
          : sit === 'ENCERRADA' ? html`<div class="mt-16">${callout({ tone: 'neutral', iconName: 'clock', title: 'Aula já realizada', text: 'Esta reserva já foi encerrada; a alocação é exibida para consulta.' })}</div>` : ''}

        <div class="grid grid-main-aside mt-20" style="align-items:start">
          <div>
            ${podeAlocar() ? html`
              <div class="row wrap mb-16" style="gap:10px">
                <button class="btn btn-primary" data-action="auto" ${pendentes.length && livres.length ? '' : 'disabled'} style="height:38px">${icon('shuffle')} Distribuir automaticamente</button>
                <button class="btn ${modo === 'manual' ? 'btn-secondary' : 'btn-ghost'}" data-action="manual" style="height:38px">${icon('hand')} Alocar manualmente</button>
              </div>
              ${selAluno ? html`<div class="mb-16">${callout({ tone: 'info', iconName: 'hand', title: `Selecione uma estação para ${selAluno.nome}`, text: 'Clique em um computador disponível (verde) no mapa.' })}</div>` : ''}` : ''}
            <div class="card">${labMap(pcs, (pc) => pcState(pc, porPc))}</div>
            ${reserva.justificativa ? html`<div class="card card-pad-sm mt-16"><p class="kv-label">Justificativa</p><p class="text-sm mt-4" style="color:var(--text-2)">${reserva.justificativa}</p></div>` : ''}
          </div>

          <aside class="card card-pad-sm">
            <h2 class="card-title" style="font-size:14px">Alunos pendentes</h2>
            <p class="card-subtitle">${pendentes.length ? `${pendentes.length} sem estação` : total ? 'Todos os alunos foram alocados' : 'Turma sem alunos matriculados'}</p>
            <div class="student-list mt-16">
              ${pendentes.map((a) => podeAlocar()
                ? html`<button class="student ${selAluno?.id === a.id ? 'selected' : ''}" data-aluno="${a.id}">${a.nome}</button>`
                : html`<div class="student">${a.nome}</div>`)}
              ${pendentes.length && aloc.itens.length ? html`<hr class="divider" style="margin:8px 0">` : ''}
              ${aloc.itens.slice().sort((x, y) => naturalCompare(x.maquinaIdentificador, y.maquinaIdentificador)).map((a) => html`
                <div class="student" style="background:var(--primary-50)">${icon('check')} ${a.alunoNome}<span class="pc-id">${a.maquinaIdentificador}</span></div>`)}
            </div>
            <div style="border-top:1px solid var(--border);margin-top:16px;padding-top:14px">
              <p class="text-xs muted">Alocados: ${aloc.itens.length} / ${total}</p>
              <div class="progress mt-8"><span style="width:${pct}%"></span></div>
              ${pendentes.length > livres.length && aloc.disponivel ? html`<p class="text-xs mt-8" style="color:var(--warning-text-2)">${icon('alert')} Faltam ${pendentes.length - livres.length} estação(ões) ativa(s).</p>` : ''}
            </div>
          </aside>
        </div>

        <div class="row between mt-24">
          <a class="btn btn-back" href="#/reservas">${icon('arrowLeft')} Voltar</a>
          ${session.isDocente ? html`<a class="btn btn-primary" href="#/app" style="height:42px;padding:0 24px">Concluir ${icon('arrowRight')}</a>` : ''}
        </div>
      </div>`);
  }

  async function refreshAloc() {
    aloc = await alocacoes.listar(id);
    paint();
  }

  async function alocar(aluno, pc) {
    if (busy) return;
    busy = true;
    try {
      await alocacoes.alocar(id, aluno.id, pc.id);
      selAluno = null;
      toast.success(`${aluno.nome} → ${pc.identificador}`, { title: 'Aluno alocado', duration: 2500 });
      await refreshAloc();
    } catch (err) {
      showError(err, 'Não foi possível alocar');
      await refreshAloc().catch(() => {});
    } finally {
      busy = false;
    }
  }

  on(root, 'click', '[data-action=retry]', load);
  on(root, 'click', '[data-action=manual]', () => { modo = 'manual'; paint(); });
  on(root, 'click', '[data-aluno]', (e, el) => {
    const a = alunos.find((x) => String(x.id) === el.dataset.aluno);
    selAluno = selAluno?.id === a.id ? null : a;
    modo = 'manual';
    paint();
  });
  on(root, 'click', '[data-pc]', (e, el) => {
    const pc = pcs.find((p) => String(p.id) === el.dataset.pc);
    if (selAluno && pc) alocar(selAluno, pc);
  });
  on(root, 'click', '[data-action=auto]', async (e, btn) => {
    const porPc = alocadoPorPc();
    const porAluno = alocadoPorAluno();
    const livres = pcs.filter((p) => p.status === 'ATIVO' && !porPc.has(p.id));
    const pendentes = alunos.filter((a) => !porAluno.has(a.id));
    const n = Math.min(livres.length, pendentes.length);
    const ok = await confirmDialog({
      title: 'Distribuir automaticamente?',
      message: `${plural(n, 'aluno será alocado', 'alunos serão alocados')} nas estações livres, em ordem alfabética. As alocações não podem ser desfeitas por esta tela.`,
      confirmLabel: 'Distribuir', iconName: 'shuffle',
    });
    if (!ok) return;
    btn.classList.add('is-loading');
    busy = true;
    let feitos = 0;
    const falhas = [];
    for (let i = 0; i < n; i++) {
      try {
        await alocacoes.alocar(id, pendentes[i].id, livres[i].id);
        feitos++;
      } catch (err) {
        falhas.push(`${pendentes[i].nome}: ${err.message}`);
      }
    }
    busy = false;
    if (feitos) toast.success(`${plural(feitos, 'aluno alocado', 'alunos alocados')} automaticamente.`, { title: 'Distribuição concluída' });
    if (falhas.length) toast.warning(falhas.slice(0, 3).join(' | '), { title: `${falhas.length} alocação(ões) falharam`, duration: 8000 });
    await refreshAloc().catch((err) => showError(err));
  });

  await load();
}
