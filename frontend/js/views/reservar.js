// Assistente de reserva (Docente): 1) Data e horário  2) Escolher laboratório  3) Confirmar e alocar
import { html, render, on, $, formData, showFieldErrors, clearFieldErrors, withLoading } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { navigate } from '../core/router.js';
import { toast, showError, loadingBlock, errorState, emptyState } from '../core/ui.js';
import { toISODate, fmtDate, fmtRange, plural, minutesOf } from '../core/format.js';
import { turmas } from '../services/turmas.js';
import { laboratorios } from '../services/laboratorios.js';
import { reservas, conflita } from '../services/reservas.js';
import { stepper, callout, labMap } from '../components/common.js';
import { PC_STATUS } from '../services/laboratorios.js';

const STEPS = ['Data e horário', 'Escolher laboratório', 'Confirmar e alocar'];

const novoRascunho = () => ({
  step: 1, data: '', turmaId: '', horaInicio: '19:00', horaFim: '21:00',
  laboratorioId: null, justificativa: '', filtro: 'todos', conflitos: [],
});
let draft = novoRascunho();

export default async function reservar(ctx) {
  const { root } = ctx;
  let listaTurmas = [];
  let labs = [];
  let minhas = [];

  const turmaSel = () => listaTurmas.find((t) => String(t.id) === String(draft.turmaId));
  const labSel = () => labs.find((l) => String(l.id) === String(draft.laboratorioId));

  async function load() {
    render(root, html`<div class="page narrow">${loadingBlock('Carregando suas turmas...')}</div>`);
    try {
      [listaTurmas, labs, minhas] = await Promise.all([
        turmas.listar(),
        laboratorios.listarComResumo(),
        reservas.listar().catch(() => []),
      ]);
    } catch (err) {
      render(root, html`<div class="page narrow">${errorState(err)}</div>`);
      return;
    }
    if (draft.turmaId && !turmaSel()) draft.turmaId = '';
    if (!draft.turmaId && listaTurmas[0]) draft.turmaId = String(listaTurmas[0].id);
    if (!draft.data) draft.data = toISODate();
    paint();
  }

  function paint() {
    if (!listaTurmas.length) {
      render(root, html`<div class="page narrow">
        <div class="page-header"><h1 class="page-title">Reservar laboratório</h1></div>
        <div class="card">${emptyState({ iconName: 'users', title: 'Você ainda não possui turmas', text: 'As turmas são cadastradas pelo administrador. Solicite o cadastro da sua turma para poder reservar um laboratório.' })}</div>
      </div>`);
      return;
    }
    if (draft.step === 1) step1();
    else if (draft.step === 2) step2();
    else step3();
  }

  /* ---------- Etapa 1 ---------- */
  function step1() {
    const t = turmaSel();
    render(root, html`
      <div class="page narrow">
        <div class="page-header" style="margin-bottom:16px"><h1 class="page-title">Reservar laboratório</h1></div>
        ${stepper(STEPS, 1)}
        <form class="card card-pad mt-24" novalidate data-form>
          <h2 class="card-title" style="padding-bottom:16px;border-bottom:1px solid var(--border)">Etapa 1 — Dados da aula</h2>
          <div class="form-grid mt-20">
            <div class="field">
              <label class="label" for="data">Data</label>
              <input class="input" type="date" id="data" name="data" value="${draft.data}" min="${toISODate()}" required>
              <div class="field-error"></div>
            </div>
            <div class="field">
              <label class="label" for="turmaId">Turma</label>
              <select class="select" id="turmaId" name="turmaId" required>
                ${listaTurmas.map((x) => html`<option value="${x.id}" ${String(x.id) === String(draft.turmaId) ? 'selected' : ''}>${x.nome}</option>`)}
              </select>
              <div class="field-error"></div>
            </div>
            <div class="field">
              <label class="label" for="horaInicio">Horário inicial</label>
              <input class="input" type="time" id="horaInicio" name="horaInicio" value="${draft.horaInicio}" step="300" required>
              <div class="field-error"></div>
            </div>
            <div class="field">
              <label class="label" for="horaFim">Horário final</label>
              <input class="input" type="time" id="horaFim" name="horaFim" value="${draft.horaFim}" step="300" required>
              <div class="field-error"></div>
            </div>
            <div class="field span-2">
              <label class="label" for="disciplina">Disciplina</label>
              <input class="input" id="disciplina" value="${t?.disciplina || ''}" readonly data-disciplina>
            </div>
            <div class="field">
              <label class="label" for="qtd">Quantidade de alunos</label>
              <input class="input" id="qtd" value="${t?.alunos.length ?? 0}" readonly data-qtd>
              <p class="hint">Alunos matriculados na turma.</p>
            </div>
          </div>
          <div data-overlap class="mt-20"></div>
          <div class="row between mt-24" style="padding-top:20px;border-top:1px solid var(--border)">
            <a class="btn btn-back" href="#/app">${icon('arrowLeft')} Cancelar</a>
            <button class="btn btn-primary" type="submit" style="height:40px;padding:0 24px">Continuar ${icon('arrowRight')}</button>
          </div>
        </form>
      </div>`);

    const form = $('[data-form]', root);
    const checkOverlap = () => {
      const d = formData(form);
      const choques = minhas.filter((r) => d.horaFim > d.horaInicio && conflita(r, d.data, d.horaInicio, d.horaFim));
      render($('[data-overlap]', root), choques.length ? callout({
        tone: 'warning', title: 'Você já possui aula neste horário',
        text: choques.map((r) => `${r.disciplina} · ${r.laboratorioNome} (${fmtRange(r.horaInicio, r.horaFim)})`).join(' | '),
      }) : '');
    };
    form.addEventListener('input', checkOverlap);
    checkOverlap();
    form.turmaId.addEventListener('change', () => {
      draft.turmaId = form.turmaId.value;
      const tt = turmaSel();
      $('[data-disciplina]', root).value = tt?.disciplina || '';
      $('[data-qtd]', root).value = tt?.alunos.length ?? 0;
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      clearFieldErrors(form);
      const d = formData(form);
      const errors = {};
      const hoje = toISODate();
      if (!d.data) errors.data = 'Informe a data da aula.';
      else if (d.data < hoje) errors.data = 'Não é possível reservar em data passada.';
      if (!d.horaInicio) errors.horaInicio = 'Informe o horário inicial.';
      if (!d.horaFim) errors.horaFim = 'Informe o horário final.';
      else if (d.horaInicio && d.horaFim <= d.horaInicio) errors.horaFim = 'Deve ser posterior ao horário inicial.';
      if (!errors.data && !errors.horaInicio && d.data === hoje) {
        const now = new Date();
        if (minutesOf(d.horaInicio) <= now.getHours() * 60 + now.getMinutes()) errors.horaInicio = 'Este horário já passou.';
      }
      if (showFieldErrors(form, errors)) return;
      const mudou = d.data !== draft.data || d.horaInicio !== draft.horaInicio || d.horaFim !== draft.horaFim;
      Object.assign(draft, d, { step: 2 });
      if (mudou) draft.conflitos = [];
      paint();
    });
  }

  /* ---------- Etapa 2 ---------- */
  function labInfo(l) {
    const t = turmaSel();
    const alunos = t?.alunos.length || 0;
    const minha = minhas.find((r) => r.laboratorioId === l.id && conflita(r, draft.data, draft.horaInicio, draft.horaFim));
    if (draft.conflitos.includes(l.id)) return { ok: false, badge: ['danger', 'Indisponível'], msg: 'Já existe uma reserva neste laboratório para o horário escolhido.' };
    if (minha) return { ok: false, badge: ['danger', 'Indisponível'], msg: `Você já reservou este laboratório: ${minha.disciplina}, ${fmtRange(minha.horaInicio, minha.horaFim)}.` };
    if (!l.total) return { ok: false, badge: ['neutral', 'Sem computadores'], msg: 'Este laboratório ainda não possui computadores cadastrados.' };
    if (!l.ativos) return { ok: false, badge: ['danger', 'Bloqueado'], msg: 'Nenhum computador ativo — laboratório em manutenção.' };
    if (l.ativos < alunos) return { ok: true, badge: ['warning', 'Capacidade limitada'], msg: `${l.ativos} estações ativas para ${alunos} alunos. Nem todos poderão ser alocados.`, warn: true };
    return { ok: true, badge: ['success', 'Disponível'] };
  }

  function step2() {
    const t = turmaSel();
    const blocos = [...new Set(labs.map((l) => l.bloco))].sort();
    const filtros = [['todos', 'Todos'], ['disponiveis', 'Disponíveis'], ['capacidade', `Cap. ${t.alunos.length}+`], ...blocos.map((b) => [`bloco:${b}`, b])];
    const visiveis = labs.filter((l) => {
      const f = draft.filtro;
      if (f === 'disponiveis') return labInfo(l).ok;
      if (f === 'capacidade') return l.ativos >= t.alunos.length;
      if (f.startsWith('bloco:')) return l.bloco === f.slice(6);
      return true;
    });

    render(root, html`
      <div class="page medium">
        <div class="page-header" style="margin-bottom:16px"><h1 class="page-title">Reservar laboratório</h1></div>
        ${stepper(STEPS, 2)}
        <div class="summary-strip info mt-24">
          <div><span>Data:</span><strong>${fmtDate(draft.data)}</strong></div>
          <div><span>Horário:</span><strong>${fmtRange(draft.horaInicio, draft.horaFim)}</strong></div>
          <div><span>Alunos:</span><strong>${t.alunos.length}</strong></div>
          <div><span>Turma:</span><strong>${t.nome}</strong></div>
        </div>
        <div class="chips mt-20" role="toolbar" aria-label="Filtros">
          ${filtros.map(([k, label]) => html`<button class="chip ${draft.filtro === k ? 'active' : ''}" data-filtro="${k}" aria-pressed="${draft.filtro === k}">${label}</button>`)}
        </div>
        <div class="stack mt-16" style="--gap:14px">
          ${visiveis.length ? visiveis.map((l) => {
            const info = labInfo(l);
            return html`
              <div class="card card-pad-sm ${info.ok ? '' : 'is-disabled'}" style="padding:20px 24px">
                <div class="row between start">
                  <div class="grow">
                    <div class="row wrap"><h3 class="text-lg fw-600" style="color:${info.ok ? 'var(--text)' : 'var(--muted-2)'}">${l.nome}</h3><span class="badge badge-${info.badge[0]} dot">${info.badge[1]}</span></div>
                    <p class="text-sm muted mt-8">Capacidade: ${plural(l.ativos, 'computador ativo', 'computadores ativos')}${l.total !== l.ativos ? html` <span class="subtle">(de ${l.total})</span>` : ''}</p>
                    ${info.msg ? html`<p class="text-sm mt-8" style="color:${info.warn ? 'var(--warning-text-2)' : 'var(--danger)'}">${icon(info.warn ? 'alert' : 'alertCircle')} ${info.msg}</p>` : ''}
                    <div class="row wrap mt-12" style="gap:6px">
                      <span class="tag">${l.bloco}</span>
                      ${l.manutencao ? html`<span class="tag">${l.manutencao} em manutenção</span>` : ''}
                      ${l.desativados ? html`<span class="tag">${l.desativados} desativado(s)</span>` : ''}
                    </div>
                  </div>
                  ${info.ok
                    ? html`<button class="btn btn-primary" data-lab="${l.id}" style="height:38px">Selecionar</button>`
                    : html`<button class="btn" disabled style="--btn-bg:var(--bg);--btn-fg:var(--faint);--btn-bd:transparent">Indisponível</button>`}
                </div>
              </div>`;
          }) : html`<div class="card">${emptyState({ iconName: 'filter', title: 'Nenhum laboratório encontrado', text: labs.length ? 'Nenhum laboratório corresponde ao filtro selecionado.' : 'Ainda não há laboratórios cadastrados.' })}</div>`}
        </div>
        <p class="hint mt-16">${icon('info')} A disponibilidade final é confirmada pelo servidor no momento da reserva, considerando as reservas de outros docentes.</p>
        <div class="mt-20"><button class="btn btn-back" data-action="back">${icon('arrowLeft')} Voltar</button></div>
      </div>`);
  }

  /* ---------- Etapa 3 ---------- */
  function step3() {
    const t = turmaSel();
    const l = labSel();
    if (!l) { draft.step = 2; return paint(); }
    render(root, html`
      <div class="page">
        <div class="page-header" style="margin-bottom:16px"><h1 class="page-title">${l.nome} — Confirmar reserva</h1></div>
        ${stepper(STEPS, 3)}
        <div class="summary-strip mt-24">
          <div><p class="kv-label">Laboratório</p><p class="kv-value">${l.nome.replace(/^Laborat[óo]rio\s*/i, '') || l.nome}</p></div>
          <div><p class="kv-label">Data</p><p class="kv-value">${fmtDate(draft.data)}</p></div>
          <div><p class="kv-label">Horário</p><p class="kv-value">${fmtRange(draft.horaInicio, draft.horaFim)}</p></div>
          <div><p class="kv-label">Turma</p><p class="kv-value">${t.nome}</p></div>
          <div><p class="kv-label">Alunos</p><p class="kv-value">${t.alunos.length}</p></div>
          <div><p class="kv-label">Estações disp.</p><p class="kv-value">${l.ativos}/${l.total}</p></div>
        </div>
        <div class="grid grid-main-aside mt-20" style="align-items:start">
          <div class="card">
            <div class="card-header flat"><div><h2 class="card-title">Mapa do laboratório</h2><p class="card-subtitle">Pré-visualização das estações. A alocação dos alunos é feita logo após confirmar.</p></div></div>
            ${labMap(l.pcs, (pc) => {
              const s = PC_STATUS[pc.status];
              return { cls: s.cls, sub: s.map };
            })}
          </div>
          <form class="card card-pad-sm" data-form novalidate>
            <h2 class="card-title" style="font-size:14px">Detalhes da reserva</h2>
            <p class="card-subtitle">${t.disciplina}</p>
            <div class="field mt-16">
              <label class="label" for="justificativa">Justificativa / objetivo da aula</label>
              <textarea class="textarea" id="justificativa" name="justificativa" maxlength="255" rows="4" placeholder="Ex.: Aula prática de herança e polimorfismo">${draft.justificativa}</textarea>
              <p class="hint"><span data-count>${draft.justificativa.length}</span>/255 caracteres · opcional</p>
              <div class="field-error"></div>
            </div>
            ${l.ativos < t.alunos.length ? html`<div class="mt-12">${callout({ tone: 'warning', title: 'Capacidade limitada', text: `${t.alunos.length - l.ativos} aluno(s) ficarão sem estação.` })}</div>` : ''}
            <button class="btn btn-primary btn-block mt-16" type="submit" style="height:42px">${icon('check')} Confirmar reserva</button>
            <button class="btn btn-back btn-block mt-8" type="button" data-action="back">${icon('arrowLeft')} Voltar</button>
          </form>
        </div>
      </div>`);

    const form = $('[data-form]', root);
    form.justificativa.addEventListener('input', () => {
      draft.justificativa = form.justificativa.value;
      $('[data-count]', root).textContent = form.justificativa.value.length;
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      draft.justificativa = form.justificativa.value.trim();
      await withLoading(form.querySelector('button[type=submit]'), async () => {
        try {
          const r = await reservas.criar(draft);
          draft = novoRascunho();
          toast.success(`${r.laboratorioNome} reservado para ${fmtDate(r.data)}, ${fmtRange(r.horaInicio, r.horaFim)}.`, { title: 'Reserva confirmada!' });
          navigate(`/reservas/${r.id}?nova=1`);
        } catch (err) {
          if (err.status === 409) {
            draft.conflitos.push(l.id);
            draft.laboratorioId = null;
            draft.step = 2;
            paint();
            toast.error('Outro docente já reservou este laboratório no horário escolhido. Selecione outro laboratório.', { title: 'Horário indisponível' });
            return;
          }
          if (err.fieldErrors) showFieldErrors(form, err.fieldErrors);
          showError(err, 'Não foi possível concluir a reserva');
        }
      });
    });
  }

  on(root, 'click', '[data-action=retry]', load);
  on(root, 'click', '[data-action=back]', () => { draft.step = Math.max(1, draft.step - 1); paint(); });
  on(root, 'click', '[data-filtro]', (e, el) => { draft.filtro = el.dataset.filtro; paint(); });
  on(root, 'click', '[data-lab]', (e, el) => { draft.laboratorioId = Number(el.dataset.lab); draft.step = 3; paint(); window.scrollTo(0, 0); });

  await load();
}
