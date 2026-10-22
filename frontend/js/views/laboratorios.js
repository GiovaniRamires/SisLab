// Laboratórios — todos consultam; ADM cadastra, edita, exclui e gerencia computadores.
import { html, render, on, $, debounce, showFieldErrors } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { session } from '../core/session.js';
import { navigate } from '../core/router.js';
import { toast, showError, formModal, confirmDialog, openModal, errorState, emptyState, loadingBlock } from '../core/ui.js';
import { normalize, plural, fmtDate, fmtRange } from '../core/format.js';
import { laboratorios, computadores, resumoLab, PC_STATUS } from '../services/laboratorios.js';
import { reservas, situacao } from '../services/reservas.js';
import { invalidate } from '../services/cache.js';
import { pageHeader, skeletonRows, labMap, pcBadge, reservaBadge, statCard } from '../components/common.js';
import { refreshNotifications } from '../components/shell.js';

const labFields = (l = {}) => html`
  <div class="field"><label class="label" for="nome">Nome<span class="req">*</span></label>
    <input class="input" id="nome" name="nome" value="${l.nome || ''}" placeholder="Ex.: Laboratório 05" required maxlength="80"><div class="field-error"></div></div>
  <div class="field"><label class="label" for="bloco">Bloco<span class="req">*</span></label>
    <input class="input" id="bloco" name="bloco" value="${l.bloco || ''}" placeholder="Ex.: Bloco A" required maxlength="40"><div class="field-error"></div></div>`;

export const statusOptions = (sel = 'ATIVO') => Object.entries(PC_STATUS).map(([k, v]) => html`<option value="${k}" ${k === sel ? 'selected' : ''}>${v.label}</option>`);

/** Modal de cadastro de computadores (individual ou em lote). */
export async function adicionarComputadoresModal(labs, labId) {
  return formModal({
    title: 'Adicionar computadores',
    description: 'Cadastre uma máquina ou gere várias de uma vez com numeração sequencial.',
    iconName: 'monitor',
    submitLabel: 'Cadastrar',
    fields: html`
      <div class="field"><label class="label" for="laboratorioId">Laboratório<span class="req">*</span></label>
        <select class="select" id="laboratorioId" name="laboratorioId" required>${labs.map((l) => html`<option value="${l.id}" ${String(l.id) === String(labId) ? 'selected' : ''}>${l.nome} — ${l.bloco}</option>`)}</select></div>
      <div class="segmented" role="tablist">
        <button type="button" class="active" data-modo="lote">${icon('layers')} Em lote</button>
        <button type="button" data-modo="unico">${icon('monitor')} Individual</button>
      </div>
      <input type="hidden" name="modo" value="lote">
      <div class="form-grid" data-lote>
        <div class="field"><label class="label" for="prefixo">Prefixo</label><input class="input" id="prefixo" name="prefixo" value="PC"><div class="field-error"></div></div>
        <div class="field"><label class="label" for="digitos">Dígitos</label><select class="select" id="digitos" name="digitos"><option value="2" selected>2 (PC 01)</option><option value="3">3 (PC 001)</option><option value="0">Sem zeros (PC 1)</option></select></div>
        <div class="field"><label class="label" for="de">De<span class="req">*</span></label><input class="input" id="de" name="de" type="number" min="1" max="999" value="1"><div class="field-error"></div></div>
        <div class="field"><label class="label" for="ate">Até<span class="req">*</span></label><input class="input" id="ate" name="ate" type="number" min="1" max="999" value="20"><div class="field-error"></div></div>
      </div>
      <div class="field" data-unico hidden><label class="label" for="identificador">Identificador<span class="req">*</span></label><input class="input" id="identificador" name="identificador" placeholder="Ex.: PC 21" maxlength="40"><div class="field-error"></div></div>
      <div class="field"><label class="label" for="status">Status inicial</label><select class="select" id="status" name="status">${statusOptions()}</select></div>
      <p class="hint" data-preview></p>`,
    onMount: (form) => {
      const preview = () => {
        const d = Object.fromEntries(new FormData(form));
        if (d.modo !== 'lote') { $('[data-preview]', form).textContent = ''; return; }
        const n = Math.max(0, Number(d.ate) - Number(d.de) + 1);
        const fmt = (i) => `${d.prefixo ? d.prefixo.trim() + ' ' : ''}${Number(d.digitos) ? String(i).padStart(Number(d.digitos), '0') : i}`;
        $('[data-preview]', form).textContent = n > 0 ? `Serão criados ${n} computadores: ${fmt(Number(d.de))} … ${fmt(Number(d.ate))}` : 'Intervalo inválido.';
      };
      form.addEventListener('input', preview);
      form.addEventListener('click', (e) => {
        const b = e.target.closest('[data-modo]');
        if (!b) return;
        form.querySelectorAll('[data-modo]').forEach((x) => x.classList.toggle('active', x === b));
        form.modo.value = b.dataset.modo;
        $('[data-lote]', form).hidden = b.dataset.modo !== 'lote';
        $('[data-unico]', form).hidden = b.dataset.modo !== 'unico';
        preview();
      });
      preview();
    },
    onSubmit: async (d, form) => {
      if (d.modo === 'unico') {
        if (!d.identificador) { showFieldErrors(form, { identificador: 'Informe o identificador.' }); return false; }
        await computadores.criar(d);
        toast.success(`${d.identificador} cadastrado.`, { title: 'Computador adicionado' });
        return true;
      }
      const de = Number(d.de);
      const ate = Number(d.ate);
      if (!de || !ate || ate < de) { showFieldErrors(form, { ate: 'Informe um intervalo válido.' }); return false; }
      if (ate - de > 199) { showFieldErrors(form, { ate: 'Máximo de 200 computadores por vez.' }); return false; }
      const existentes = new Set((await computadores.porLaboratorio(d.laboratorioId)).map((p) => normalize(p.identificador)));
      const ids = [];
      for (let i = de; i <= ate; i++) ids.push(`${d.prefixo ? d.prefixo.trim() + ' ' : ''}${Number(d.digitos) ? String(i).padStart(Number(d.digitos), '0') : i}`);
      const novos = ids.filter((x) => !existentes.has(normalize(x)));
      let ok = 0;
      for (let i = 0; i < novos.length; i += 8) {
        const res = await Promise.allSettled(novos.slice(i, i + 8).map((identificador) => computadores.criar({ identificador, status: d.status, laboratorioId: d.laboratorioId })));
        ok += res.filter((r) => r.status === 'fulfilled').length;
      }
      const pulados = ids.length - novos.length;
      toast.success(`${plural(ok, 'computador cadastrado', 'computadores cadastrados')}${pulados ? ` (${pulados} já existiam)` : ''}.`, { title: 'Computadores adicionados' });
      return true;
    },
  });
}

/* ===================== Lista ===================== */
export async function laboratoriosList(ctx) {
  const { root } = ctx;
  const admin = session.isAdmin;
  let lista = [];
  let busca = '';

  const header = pageHeader({
    title: 'Laboratórios',
    subtitle: admin ? 'Cadastre e gerencie os laboratórios e suas máquinas.' : 'Consulte os laboratórios e a disponibilidade dos computadores.',
    actions: admin ? html`<button class="btn btn-primary" data-action="novo">${icon('plus')} Novo laboratório</button>` : '',
  });

  function card(l) {
    const pct = l.total ? Math.round((l.ativos / l.total) * 100) : 0;
    const badge = !l.total ? html`<span class="badge badge-neutral">Sem máquinas</span>`
      : !l.ativos ? html`<span class="badge badge-danger dot">Bloqueado</span>`
      : l.manutencao ? html`<span class="badge badge-warning dot">Manutenção parcial</span>`
      : html`<span class="badge badge-success dot">Disponível</span>`;
    return html`
      <div class="card interactive" data-href="/laboratorios/${l.id}" tabindex="0" role="link" aria-label="${l.nome}">
        <div style="padding:20px 22px">
          <div class="row between start">
            <span class="feature-icon" style="margin:0;width:40px;height:40px;font-size:18px">${icon('building')}</span>
            ${badge}
          </div>
          <h3 class="fw-600 mt-16" style="font-size:16px">${l.nome}</h3>
          <p class="text-sm muted mt-4">${icon('mapPin')} ${l.bloco}</p>
          <div class="row between mt-16 text-xs muted"><span>${l.ativos} de ${l.total} ativos</span><span>${pct}%</span></div>
          <div class="progress success mt-8"><span style="width:${pct}%"></span></div>
          <div class="row wrap mt-16" style="gap:6px">
            <span class="badge badge-success">${l.ativos} ativos</span>
            ${l.manutencao ? html`<span class="badge badge-warning">${l.manutencao} manutenção</span>` : ''}
            ${l.desativados ? html`<span class="badge badge-danger">${l.desativados} desativados</span>` : ''}
          </div>
        </div>
        ${admin ? html`
          <div class="row end" style="padding:10px 14px;border-top:1px solid var(--border);gap:4px">
            <button class="btn btn-ghost btn-sm" data-edit="${l.id}">${icon('edit')} Editar</button>
            <button class="btn btn-ghost btn-sm" data-del="${l.id}" style="--btn-fg:var(--danger-strong)">${icon('trash')} Excluir</button>
          </div>` : ''}
      </div>`;
  }

  function paintGrid() {
    const q = normalize(busca);
    const itens = lista.filter((l) => !q || normalize(`${l.nome} ${l.bloco}`).includes(q));
    render($('[data-grid]', root), itens.length ? html`<div class="grid grid-auto">${itens.map(card)}</div>`
      : html`<div class="card">${emptyState({
        iconName: 'building',
        title: lista.length ? 'Nenhum laboratório encontrado' : 'Nenhum laboratório cadastrado',
        text: lista.length ? 'Tente outro termo de busca.' : admin ? 'Cadastre o primeiro laboratório para começar.' : 'Os laboratórios ainda não foram cadastrados pela administração.',
        action: !lista.length && admin ? html`<button class="btn btn-primary" data-action="novo">${icon('plus')} Novo laboratório</button>` : '',
      })}</div>`);
  }

  async function load() {
    render(root, html`<div class="page wide">${header}${skeletonRows(3)}</div>`);
    try {
      lista = await laboratorios.listarComResumo();
      if (!ctx.isCurrent()) return;
      const tot = lista.reduce((a, l) => ({ total: a.total + l.total, ativos: a.ativos + l.ativos, man: a.man + l.manutencao }), { total: 0, ativos: 0, man: 0 });
      render(root, html`
        <div class="page wide">
          ${header}
          <div class="grid grid-4 mb-16">
            ${statCard({ label: 'Laboratórios', value: String(lista.length).padStart(2, '0'), tone: 'primary' })}
            ${statCard({ label: 'Computadores', value: String(tot.total).padStart(2, '0') })}
            ${statCard({ label: 'Ativos', value: String(tot.ativos).padStart(2, '0'), tone: 'success' })}
            ${statCard({ label: 'Em manutenção', value: String(tot.man).padStart(2, '0'), tone: tot.man ? 'warning' : '' })}
          </div>
          <div class="input-icon mb-16" style="max-width:420px">${icon('search')}<input class="input" type="search" placeholder="Buscar por nome ou bloco..." data-busca value="${busca}" aria-label="Buscar"></div>
          <div data-grid></div>
        </div>`);
      paintGrid();
    } catch (err) {
      render(root, html`<div class="page wide">${header}<div class="card">${errorState(err)}</div></div>`);
    }
  }

  const novo = async () => {
    const r = await formModal({ title: 'Novo laboratório', iconName: 'building', submitLabel: 'Cadastrar', fields: labFields(), onSubmit: (d) => laboratorios.criar(d) });
    if (r && r !== true) {
      toast.success(`${r.nome} cadastrado. Agora adicione os computadores.`, { title: 'Laboratório criado' });
      navigate(`/laboratorios/${r.id}?addpcs=1`);
    }
  };

  on(root, 'click', '[data-action=novo]', novo);
  on(root, 'click', '[data-action=retry]', load);
  on(root, 'input', '[data-busca]', debounce((e) => { busca = e.target.value; paintGrid(); }, 120));
  on(root, 'click', '[data-href]', (e, el) => { if (!e.target.closest('button')) navigate(el.dataset.href); });
  on(root, 'keydown', '[data-href]', (e, el) => { if (e.key === 'Enter' && e.target === el) navigate(el.dataset.href); });
  on(root, 'click', '[data-edit]', async (e, el) => {
    const l = lista.find((x) => String(x.id) === el.dataset.edit);
    const r = await formModal({ title: 'Editar laboratório', iconName: 'edit', fields: labFields(l), onSubmit: (d) => laboratorios.atualizar(l.id, d) });
    if (r) { toast.success('Laboratório atualizado.'); load(); }
  });
  on(root, 'click', '[data-del]', async (e, el) => {
    const l = lista.find((x) => String(x.id) === el.dataset.del);
    if (await excluirLaboratorio(l)) load();
  });

  await load();
  if (admin && ctx.query.get('novo') === '1') novo();
}

async function excluirLaboratorio(l) {
  const ok = await confirmDialog({
    title: `Excluir ${l.nome}?`,
    message: l.total ? `Os ${l.total} computadores deste laboratório também serão excluídos. Esta ação não pode ser desfeita.` : 'Esta ação não pode ser desfeita.',
    confirmLabel: 'Excluir', danger: true,
  });
  if (!ok) return false;
  try {
    for (const pc of l.pcs) await computadores.remover(pc.id);
    await laboratorios.remover(l.id);
    toast.success(`${l.nome} foi excluído.`, { title: 'Laboratório excluído' });
    refreshNotifications();
    return true;
  } catch (err) {
    if (err.status === 409) toast.error('Este laboratório possui reservas ou vínculos e não pode ser excluído.', { title: 'Exclusão bloqueada' });
    else showError(err, 'Não foi possível excluir');
    invalidate('labs', 'pcs');
    return true;
  }
}

/* ===================== Detalhe ===================== */
export async function laboratorioDetalhe(ctx) {
  const { root, params } = ctx;
  const admin = session.isAdmin;
  let lab;
  let labs = [];
  let proximas = [];
  const back = { href: '/laboratorios', label: 'Laboratórios' };

  function paint() {
    const st = (pc) => {
      const s = PC_STATUS[pc.status];
      return { cls: s.cls, sub: s.map, clickable: admin, title: admin ? `${pc.identificador} — clique para gerenciar` : `${pc.identificador} — ${s.label}` };
    };
    render(root, html`
      <div class="page">
        ${pageHeader({
          title: lab.nome, subtitle: html`${icon('mapPin')} ${lab.bloco}`, back,
          actions: admin ? html`
            <button class="btn btn-secondary" data-action="editar">${icon('edit')} Editar</button>
            <button class="btn btn-danger-soft" data-action="excluir">${icon('trash')} Excluir</button>
            <button class="btn btn-primary" data-action="addpcs">${icon('plus')} Adicionar computadores</button>`
            : session.isDocente ? html`<a class="btn btn-primary" href="#/reservar">${icon('plus')} Reservar</a>` : '',
        })}
        <div class="grid grid-4">
          ${statCard({ label: 'Total de computadores', value: String(lab.total).padStart(2, '0'), tone: 'primary' })}
          ${statCard({ label: 'Ativos', value: String(lab.ativos).padStart(2, '0'), tone: 'success' })}
          ${statCard({ label: 'Em manutenção', value: String(lab.manutencao).padStart(2, '0'), tone: lab.manutencao ? 'warning' : '' })}
          ${statCard({ label: 'Desativados', value: String(lab.desativados).padStart(2, '0'), tone: lab.desativados ? 'danger' : '' })}
        </div>
        <div class="grid grid-main-aside mt-20" style="align-items:start">
          <div class="card">
            <div class="card-header flat"><div><h2 class="card-title">Mapa do laboratório</h2>${admin ? html`<p class="card-subtitle">Clique em um computador para alterar o status ou removê-lo.</p>` : ''}</div></div>
            ${labMap(lab.pcs, st)}
          </div>
          <div class="card">
            <div class="card-header"><h2 class="card-title" style="font-size:14px">Próximas reservas</h2></div>
            ${session.isDiscente ? html`<div class="card-body text-sm muted">As reservas são gerenciadas pelos docentes.</div>`
              : proximas.length ? proximas.slice(0, 6).map((r) => html`
                <a class="list-row" href="#/reservas/${r.id}" style="padding:12px 18px">
                  <div><p class="list-title">${fmtDate(r.data)} · ${fmtRange(r.horaInicio, r.horaFim)}</p><p class="list-meta">${r.disciplina}${admin ? ` · ${r.docenteNome}` : ''}</p></div>${reservaBadge(r)}
                </a>`) : html`<div class="card-body text-sm muted">Nenhuma reserva agendada${admin ? '' : ' por você'} neste laboratório.</div>`}
          </div>
        </div>
      </div>`);
  }

  async function load() {
    render(root, html`<div class="page">${loadingBlock('Carregando laboratório...')}</div>`);
    try {
      invalidate('pcs');
      const [l, pcs, ls, rs] = await Promise.all([
        laboratorios.buscar(params.id),
        computadores.porLaboratorio(params.id),
        laboratorios.listar(),
        session.isDiscente ? [] : reservas.listar().catch(() => []),
      ]);
      lab = resumoLab(l, pcs);
      labs = ls;
      proximas = rs.filter((r) => String(r.laboratorioId) === String(params.id) && ['AGENDADA', 'EM_ANDAMENTO'].includes(situacao(r)));
      if (ctx.isCurrent()) paint();
    } catch (err) {
      const e = err.status === 404 ? { status: 404, message: 'Laboratório não encontrado.' } : err;
      render(root, html`<div class="page">${pageHeader({ title: 'Laboratório', back })}<div class="card">${errorState(e)}</div></div>`);
    }
  }

  async function addPcs() {
    const r = await adicionarComputadoresModal(labs, lab.id);
    if (r) { await load(); refreshNotifications(); }
  }

  on(root, 'click', '[data-action=retry]', load);
  on(root, 'click', '[data-action=addpcs]', addPcs);
  on(root, 'click', '[data-action=editar]', async () => {
    const r = await formModal({ title: 'Editar laboratório', iconName: 'edit', fields: labFields(lab), onSubmit: (d) => laboratorios.atualizar(lab.id, d) });
    if (r) { toast.success('Laboratório atualizado.'); load(); }
  });
  on(root, 'click', '[data-action=excluir]', async () => {
    if (await excluirLaboratorio(lab)) navigate('/laboratorios');
  });
  on(root, 'click', '[data-pc]', (e, el) => {
    const pc = lab.pcs.find((p) => String(p.id) === el.dataset.pc);
    if (pc) gerenciarPc(pc, load);
  });

  await load();
  if (admin && ctx.query.get('addpcs') === '1' && lab) addPcs();
}

/** Modal de gerenciamento de um computador (status / exclusão). */
export function gerenciarPc(pc, onChange) {
  const m = openModal({
    title: pc.identificador,
    description: html`${pc.laboratorio?.nome || ''} · ${pcBadge(pc.status)}`,
    iconName: 'monitor',
    content: html`
      <p class="label mb-8">Alterar status</p>
      <div class="stack" style="--gap:8px">
        ${Object.entries(PC_STATUS).map(([k, v]) => html`
          <button class="btn ${k === pc.status ? 'btn-primary' : 'btn-soft'} btn-block" style="justify-content:flex-start;height:42px" data-status="${k}" ${k === pc.status ? 'disabled' : ''}>
            ${icon(v.icon)} ${v.label} ${k === pc.status ? html`<span style="margin-left:auto;font-weight:500">(atual)</span>` : ''}
          </button>`)}
      </div>`,
    footer: html`
      <button class="btn btn-danger-soft" data-remove style="margin-right:auto">${icon('trash')} Excluir</button>
      <button class="btn btn-secondary" data-close>Fechar</button>`,
  });
  m.el.addEventListener('click', async (e) => {
    const sb = e.target.closest('[data-status]');
    if (sb) {
      sb.classList.add('is-loading');
      try {
        await computadores.atualizarStatus(pc, sb.dataset.status);
        toast.success(`${pc.identificador}: ${PC_STATUS[sb.dataset.status].label}.`, { title: 'Status atualizado', duration: 2500 });
        m.close();
        onChange?.();
        refreshNotifications();
      } catch (err) { sb.classList.remove('is-loading'); showError(err); }
    }
    if (e.target.closest('[data-remove]')) {
      m.close();
      const ok = await confirmDialog({ title: `Excluir ${pc.identificador}?`, message: 'O computador será removido do laboratório.', confirmLabel: 'Excluir', danger: true });
      if (!ok) return;
      try {
        await computadores.remover(pc.id);
        toast.success(`${pc.identificador} removido.`);
        onChange?.();
      } catch (err) {
        showError(err, err.status === 409 ? 'O computador possui alocações vinculadas' : 'Não foi possível excluir');
      }
    }
  });
}
