// Turmas — ADM: cria e matricula | Docente: consulta as próprias e matricula alunos.
import { html, render, on, $, $$, debounce } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { session } from '../core/session.js';
import { navigate } from '../core/router.js';
import { toast, showError, formModal, errorState, emptyState, loadingBlock } from '../core/ui.js';
import { normalize, plural, fmtDate, fmtRange } from '../core/format.js';
import { turmas } from '../services/turmas.js';
import { usuarios } from '../services/usuarios.js';
import { reservas } from '../services/reservas.js';
import { invalidate } from '../services/cache.js';
import { pageHeader, skeletonRows, userAvatar, reservaBadge } from '../components/common.js';

/* ===================== Lista ===================== */
async function novaTurmaModal() {
  const docentes = await usuarios.listar('DOCENTE');
  if (!docentes.length) {
    toast.warning('Cadastre ao menos um docente antes de criar turmas.', { title: 'Nenhum docente' });
    return null;
  }
  return formModal({
    title: 'Nova turma',
    description: 'A turma fica vinculada a um docente responsável.',
    iconName: 'users',
    submitLabel: 'Criar turma',
    fields: html`
      <div class="field"><label class="label" for="nome">Nome da turma<span class="req">*</span></label>
        <input class="input" id="nome" name="nome" placeholder="Ex.: ADS — 3º Semestre" required maxlength="120"><div class="field-error"></div></div>
      <div class="field"><label class="label" for="disciplina">Disciplina<span class="req">*</span></label>
        <input class="input" id="disciplina" name="disciplina" placeholder="Ex.: Programação Orientada a Objetos" required maxlength="120"><div class="field-error"></div></div>
      <div class="field"><label class="label" for="docenteId">Docente responsável<span class="req">*</span></label>
        <select class="select" id="docenteId" name="docenteId" required>
          ${docentes.map((d) => html`<option value="${d.id}">${d.nome} — ${d.email}</option>`)}
        </select><div class="field-error"></div></div>`,
    onSubmit: (data) => turmas.criar(data),
  });
}

export async function turmasList(ctx) {
  const { root } = ctx;
  const admin = session.isAdmin;
  let lista = [];
  let busca = '';

  const header = pageHeader({
    title: admin ? 'Turmas' : 'Minhas turmas',
    subtitle: admin ? 'Gerencie as turmas, seus docentes e as matrículas dos alunos.' : 'Turmas sob sua responsabilidade.',
    actions: admin ? html`<button class="btn btn-primary" data-action="nova">${icon('plus')} Nova turma</button>` : '',
  });

  function paintGrid() {
    const q = normalize(busca);
    const itens = lista.filter((t) => !q || [t.nome, t.disciplina, t.docenteNome].some((v) => normalize(v).includes(q)));
    render($('[data-grid]', root), itens.length ? html`
      <div class="grid grid-auto">
        ${itens.map((t) => html`
          <a class="card interactive card-pad-sm" href="#/turmas/${t.id}" style="text-decoration:none;color:inherit;display:block;padding:20px 22px">
            <div class="row between start">
              <span class="feature-icon" style="margin:0;width:38px;height:38px;font-size:17px">${icon('users')}</span>
              <span class="badge badge-info">${plural(t.alunos.length, 'aluno', 'alunos')}</span>
            </div>
            <h3 class="fw-600 mt-16" style="font-size:15px;color:var(--text)">${t.nome}</h3>
            <p class="text-sm muted mt-4">${t.disciplina}</p>
            <div class="row mt-16" style="padding-top:14px;border-top:1px solid var(--border)">
              ${userAvatar({ nome: t.docenteNome, perfil: 'DOCENTE' })}
              <span class="text-sm" style="color:var(--text-2)">${t.docenteNome}</span>
            </div>
          </a>`)}
      </div>` : html`<div class="card">${emptyState({
        iconName: 'users',
        title: lista.length ? 'Nenhuma turma encontrada' : 'Nenhuma turma cadastrada',
        text: lista.length ? 'Tente outro termo de busca.' : admin ? 'Crie a primeira turma e vincule um docente responsável.' : 'Nenhuma turma foi atribuída a você ainda. Fale com o administrador.',
        action: !lista.length && admin ? html`<button class="btn btn-primary" data-action="nova">${icon('plus')} Nova turma</button>` : '',
      })}</div>`);
  }

  async function load() {
    render(root, html`<div class="page wide">${header}${skeletonRows(3)}</div>`);
    try {
      lista = await turmas.listar();
      if (!ctx.isCurrent()) return;
      render(root, html`
        <div class="page wide">
          ${header}
          <div class="input-icon mb-16" style="max-width:420px">${icon('search')}<input class="input" type="search" placeholder="Buscar turma, disciplina ou docente..." data-busca aria-label="Buscar" value="${busca}"></div>
          <div data-grid></div>
        </div>`);
      paintGrid();
    } catch (err) {
      render(root, html`<div class="page wide">${header}<div class="card">${errorState(err)}</div></div>`);
    }
  }

  const abrirNova = async () => {
    const t = await novaTurmaModal().catch((err) => showError(err));
    if (t && t !== true) {
      toast.success(`Turma “${t.nome}” criada.`, { title: 'Turma criada' });
      navigate(`/turmas/${t.id}`);
    }
  };

  on(root, 'click', '[data-action=nova]', abrirNova);
  on(root, 'click', '[data-action=retry]', load);
  on(root, 'input', '[data-busca]', debounce((e) => { busca = e.target.value; paintGrid(); }, 120));
  await load();
  if (admin && ctx.query.get('novo') === '1') abrirNova();
}

/* ===================== Detalhe ===================== */
export async function turmaDetalhe(ctx) {
  const { root, params } = ctx;
  let turma;
  let reservasTurma = [];
  let busca = '';
  const back = { href: '/turmas', label: 'Turmas' };

  function paintAlunos() {
    const q = normalize(busca);
    const itens = turma.alunos.filter((a) => !q || normalize(a.nome).includes(q));
    render($('[data-alunos]', root), itens.length ? html`
      <table class="table"><thead><tr><th style="width:56px">#</th><th>Aluno</th><th class="right">ID</th></tr></thead><tbody>
        ${itens.map((a, i) => html`<tr><td class="subtle mono text-xs">${String(i + 1).padStart(2, '0')}</td><td><div class="row" style="gap:10px">${userAvatar({ nome: a.nome, perfil: 'DISCENTE' })}<span class="fw-500" style="color:var(--text)">${a.nome}</span></div></td><td class="right mono text-xs subtle">${a.id}</td></tr>`)}
      </tbody></table>` : emptyState({
        iconName: 'user', title: turma.alunos.length ? 'Nenhum aluno encontrado' : 'Nenhum aluno matriculado',
        text: turma.alunos.length ? 'Tente outro termo.' : 'Matricule os discentes desta turma para poder alocá-los nas estações.',
        action: !turma.alunos.length ? html`<button class="btn btn-primary" data-action="matricular">${icon('userPlus')} Matricular alunos</button>` : '',
      }));
  }

  function paint() {
    render(root, html`
      <div class="page">
        ${pageHeader({
          title: turma.nome, subtitle: turma.disciplina, back,
          actions: html`<button class="btn btn-primary" data-action="matricular">${icon('userPlus')} Matricular alunos</button>`,
        })}
        <div class="grid grid-3">
          <div class="card stat"><p class="stat-label">Docente responsável</p><div class="row mt-8">${userAvatar({ nome: turma.docenteNome, perfil: 'DOCENTE' })}<span class="fw-600">${turma.docenteNome}</span></div></div>
          <div class="card stat"><p class="stat-label">Alunos matriculados</p><p class="stat-value primary">${String(turma.alunos.length).padStart(2, '0')}</p></div>
          <div class="card stat"><p class="stat-label">Reservas da turma</p><p class="stat-value success">${String(reservasTurma.length).padStart(2, '0')}</p></div>
        </div>
        <div class="grid grid-main-aside mt-20" style="align-items:start">
          <div class="card">
            <div class="card-header"><h2 class="card-title">Alunos</h2>
              <div class="input-icon" style="width:220px">${icon('search')}<input class="input input-sm" type="search" placeholder="Buscar aluno..." data-busca aria-label="Buscar aluno"></div>
            </div>
            <div data-alunos></div>
          </div>
          <div class="card">
            <div class="card-header"><h2 class="card-title" style="font-size:14px">Reservas</h2>${session.isDocente ? html`<a class="btn btn-link" href="#/reservar">${icon('plus')} Nova</a>` : ''}</div>
            ${reservasTurma.length ? reservasTurma.slice(-6).reverse().map((r) => html`
              <a class="list-row" href="#/reservas/${r.id}" style="padding:12px 18px">
                <div><p class="list-title">${fmtDate(r.data)} · ${fmtRange(r.horaInicio, r.horaFim)}</p><p class="list-meta">${r.laboratorioNome}</p></div>${reservaBadge(r)}
              </a>`) : html`<div class="card-body text-sm muted">Nenhuma reserva para esta turma.</div>`}
          </div>
        </div>
      </div>`);
    paintAlunos();
  }

  async function load() {
    render(root, html`<div class="page">${loadingBlock('Carregando turma...')}</div>`);
    try {
      invalidate(`turmas:${params.id}`);
      [turma, reservasTurma] = await Promise.all([
        turmas.buscar(params.id),
        reservas.listar().then((l) => l.filter((r) => String(r.turmaId) === String(params.id))).catch(() => []),
      ]);
      if (ctx.isCurrent()) paint();
    } catch (err) {
      const e = err.status === 404 ? { status: 404, message: 'Turma não encontrada.' } : err.status === 403 ? { status: 403, message: 'Esta turma pertence a outro docente.' } : err;
      render(root, html`<div class="page">${pageHeader({ title: 'Turma', back })}<div class="card">${errorState(e)}</div></div>`);
    }
  }

  async function matricular() {
    let discentes;
    try { discentes = await usuarios.listar('DISCENTE'); } catch (err) { return showError(err); }
    const ids = new Set(turma.alunos.map((a) => a.id));
    const disponiveis = discentes.filter((d) => !ids.has(d.id));
    if (!disponiveis.length) {
      toast.info(discentes.length ? 'Todos os discentes cadastrados já estão nesta turma.' : 'Não há discentes cadastrados no sistema.', { title: 'Nenhum aluno disponível' });
      return;
    }
    const r = await formModal({
      title: 'Matricular alunos', description: `Selecione os discentes para a turma ${turma.nome}.`, iconName: 'userPlus', size: 'lg',
      submitLabel: 'Matricular selecionados',
      fields: html`
        <div class="row between">
          <div class="input-icon grow">${icon('search')}<input class="input input-sm" type="search" placeholder="Filtrar por nome, e-mail ou RGM..." data-filtro></div>
          <label class="check nowrap"><input type="checkbox" data-todos> Selecionar todos</label>
        </div>
        <div class="card" style="max-height:340px;overflow-y:auto">
          ${disponiveis.map((d) => html`
            <label class="list-row clickable" style="padding:10px 16px;justify-content:flex-start;gap:12px" data-item="${normalize(`${d.nome} ${d.email} ${d.rgm}`)}">
              <input type="checkbox" name="aluno" value="${d.id}" style="accent-color:var(--primary);width:15px;height:15px">
              ${userAvatar(d)}
              <span class="grow"><span class="list-title" style="display:block">${d.nome}</span><span class="list-meta" style="display:block">${d.email} · RGM ${d.rgm}</span></span>
            </label>`)}
        </div>
        <p class="hint" data-sel>0 selecionado(s)</p>`,
      onMount: (form) => {
        const upd = () => { $('[data-sel]', form).textContent = `${$$('input[name=aluno]:checked', form).length} selecionado(s)`; };
        form.addEventListener('change', upd);
        $('[data-todos]', form).addEventListener('change', (e) => {
          $$('[data-item]', form).filter((el) => !el.hidden).forEach((el) => { el.querySelector('input').checked = e.target.checked; });
          upd();
        });
        $('[data-filtro]', form).addEventListener('input', (e) => {
          const q = normalize(e.target.value);
          $$('[data-item]', form).forEach((el) => { el.hidden = q && !el.dataset.item.includes(q); });
        });
      },
      onSubmit: async (data, form) => {
        const sel = $$('input[name=aluno]:checked', form).map((i) => i.value);
        if (!sel.length) { toast.warning('Selecione ao menos um aluno.'); return false; }
        let ok = 0;
        const falhas = [];
        for (const id of sel) {
          try { turma = await turmas.matricular(turma.id, id); ok++; } catch (err) { falhas.push(err.message); }
        }
        if (ok) toast.success(`${plural(ok, 'aluno matriculado', 'alunos matriculados')} em ${turma.nome}.`, { title: 'Matrícula concluída' });
        if (falhas.length) toast.warning(falhas[0], { title: `${falhas.length} matrícula(s) falharam` });
        return true;
      },
    });
    if (r) { invalidate(`turmas:${turma.id}`); paint(); }
  }

  on(root, 'click', '[data-action=retry]', load);
  on(root, 'click', '[data-action=matricular]', matricular);
  on(root, 'input', '[data-busca]', debounce((e) => { busca = e.target.value; paintAlunos(); }, 120));
  await load();
}
