// Computadores (ADM): inventário com filtros, alteração de status (individual e em massa) e exclusão.
import { html, render, on, $, $$, debounce } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { toast, showError, confirmDialog, errorState, emptyState } from '../core/ui.js';
import { normalize, plural } from '../core/format.js';
import { laboratorios, computadores, PC_STATUS } from '../services/laboratorios.js';
import { invalidate } from '../services/cache.js';
import { pageHeader, skeletonRows, pcBadge } from '../components/common.js';
import { refreshNotifications } from '../components/shell.js';
import { adicionarComputadoresModal, gerenciarPc } from './laboratorios.js';

const state = { busca: '', lab: '', status: '' };

export default async function computadoresView(ctx) {
  const { root } = ctx;
  let pcs = [];
  let labs = [];
  const selecionados = new Set();

  const header = pageHeader({
    title: 'Computadores',
    subtitle: 'Inventário de máquinas de todos os laboratórios.',
    actions: html`<button class="btn btn-primary" data-action="add">${icon('plus')} Adicionar computadores</button>`,
  });

  const filtrar = () => pcs.filter((p) => {
    if (state.lab && String(p.laboratorio?.id) !== state.lab) return false;
    if (state.status && p.status !== state.status) return false;
    if (state.busca && !normalize(`${p.identificador} ${p.laboratorio?.nome}`).includes(normalize(state.busca))) return false;
    return true;
  });

  function paintBulk() {
    const el = $('[data-bulk]', root);
    if (!el) return;
    el.hidden = !selecionados.size;
    $('[data-bulk-count]', root).textContent = plural(selecionados.size, 'selecionado', 'selecionados');
  }

  function paintTable() {
    const itens = filtrar();
    const el = $('[data-table]', root);
    for (const id of [...selecionados]) if (!itens.some((p) => p.id === id)) selecionados.delete(id);
    if (!itens.length) {
      render(el, emptyState({
        iconName: 'monitor',
        title: pcs.length ? 'Nenhum computador encontrado' : 'Nenhum computador cadastrado',
        text: pcs.length ? 'Ajuste os filtros para ver outras máquinas.' : labs.length ? 'Adicione computadores aos laboratórios.' : 'Cadastre um laboratório antes de adicionar computadores.',
        action: !pcs.length ? (labs.length ? html`<button class="btn btn-primary" data-action="add">${icon('plus')} Adicionar computadores</button>` : html`<a class="btn btn-primary" href="#/laboratorios?novo=1">${icon('plus')} Novo laboratório</a>`) : '',
      }));
      paintBulk();
      return;
    }
    const all = itens.every((p) => selecionados.has(p.id));
    render(el, html`
      <div class="table-wrap"><table class="table">
        <thead><tr>
          <th style="width:44px"><input type="checkbox" data-all ${all ? 'checked' : ''} aria-label="Selecionar todos" style="accent-color:var(--primary)"></th>
          <th>Identificador</th><th>Laboratório</th><th>Status</th><th class="right">Alterar status</th><th class="sr-only">Ações</th>
        </tr></thead>
        <tbody>
          ${itens.map((p) => html`
            <tr>
              <td><input type="checkbox" data-sel="${p.id}" ${selecionados.has(p.id) ? 'checked' : ''} aria-label="Selecionar ${p.identificador}" style="accent-color:var(--primary)"></td>
              <td><span class="row" style="gap:10px"><span class="notif-icon ${p.status === 'ATIVO' ? 'success' : p.status === 'EM_MANUTENCAO' ? 'warning' : 'danger'}">${icon('monitor')}</span><span class="mono fw-700" style="color:var(--text)">${p.identificador}</span></span></td>
              <td><a href="#/laboratorios/${p.laboratorio?.id}">${p.laboratorio?.nome}</a><br><span class="text-xs subtle">${p.laboratorio?.bloco}</span></td>
              <td>${pcBadge(p.status)}</td>
              <td class="right">
                <select class="select input-sm" style="width:auto;min-width:160px;display:inline-block" data-status="${p.id}" aria-label="Status de ${p.identificador}">
                  ${Object.entries(PC_STATUS).map(([k, v]) => html`<option value="${k}" ${k === p.status ? 'selected' : ''}>${v.label}</option>`)}
                </select>
              </td>
              <td class="right" style="width:52px"><button class="btn btn-ghost btn-icon btn-sm" data-del="${p.id}" aria-label="Excluir ${p.identificador}" title="Excluir" style="--btn-fg:var(--danger-strong)">${icon('trash')}</button></td>
            </tr>`)}
        </tbody>
      </table></div>
      <div class="card-footer text-xs muted">${plural(itens.length, 'computador', 'computadores')}${itens.length !== pcs.length ? ` de ${pcs.length}` : ''}</div>`);
    paintBulk();
  }

  function paint() {
    const count = (s) => pcs.filter((p) => p.status === s && (!state.lab || String(p.laboratorio?.id) === state.lab)).length;
    render(root, html`
      <div class="page wide">
        ${header}
        <div class="card">
          <div class="row wrap" style="padding:16px 24px;border-bottom:1px solid var(--border);gap:12px">
            <div class="input-icon grow" style="min-width:200px">${icon('search')}<input class="input input-sm" type="search" placeholder="Buscar identificador..." value="${state.busca}" data-busca aria-label="Buscar"></div>
            <select class="select input-sm" style="width:auto;min-width:200px" data-lab aria-label="Laboratório">
              <option value="">Todos os laboratórios</option>
              ${labs.map((l) => html`<option value="${l.id}" ${String(l.id) === state.lab ? 'selected' : ''}>${l.nome}</option>`)}
            </select>
            <div class="chips">
              <button class="chip ${!state.status ? 'active' : ''}" data-fstatus="">Todos</button>
              ${Object.entries(PC_STATUS).map(([k, v]) => html`<button class="chip ${state.status === k ? 'active' : ''}" data-fstatus="${k}">${v.label} · ${count(k)}</button>`)}
            </div>
          </div>
          <div class="row wrap" data-bulk hidden style="padding:10px 24px;background:var(--primary-50);border-bottom:1px solid var(--primary-200);gap:8px">
            <span class="text-sm fw-600" style="color:var(--primary)" data-bulk-count></span>
            <span class="grow"></span>
            ${Object.entries(PC_STATUS).map(([k, v]) => html`<button class="btn btn-secondary btn-sm" data-bulk-status="${k}">${icon(v.icon)} ${v.label}</button>`)}
            <button class="btn btn-danger-soft btn-sm" data-action="bulk-del">${icon('trash')} Excluir</button>
          </div>
          <div data-table></div>
        </div>
      </div>`);
    paintTable();
  }

  async function load() {
    invalidate('pcs', 'labs');
    render(root, html`<div class="page wide">${header}${skeletonRows(6)}</div>`);
    try {
      [pcs, labs] = await Promise.all([computadores.listar(), laboratorios.listar()]);
      if (ctx.isCurrent()) paint();
    } catch (err) {
      render(root, html`<div class="page wide">${header}<div class="card">${errorState(err)}</div></div>`);
    }
  }

  async function aplicarEmMassa(fn, label) {
    const alvo = pcs.filter((p) => selecionados.has(p.id));
    let ok = 0;
    for (let i = 0; i < alvo.length; i += 8) {
      const res = await Promise.allSettled(alvo.slice(i, i + 8).map(fn));
      ok += res.filter((r) => r.status === 'fulfilled').length;
    }
    if (ok) toast.success(`${plural(ok, 'computador', 'computadores')} ${label}.`);
    if (ok < alvo.length) toast.warning(`${alvo.length - ok} operação(ões) falharam.`);
    selecionados.clear();
    refreshNotifications();
    await load();
  }

  const add = async () => {
    if (!labs.length) return toast.warning('Cadastre um laboratório antes de adicionar computadores.');
    if (await adicionarComputadoresModal(labs, state.lab || labs[0].id)) { await load(); refreshNotifications(); }
  };

  on(root, 'click', '[data-action=add]', add);
  on(root, 'click', '[data-action=retry]', load);
  on(root, 'input', '[data-busca]', debounce((e) => { state.busca = e.target.value; paintTable(); }, 120));
  on(root, 'change', '[data-lab]', (e, el) => { state.lab = el.value; paint(); });
  on(root, 'click', '[data-fstatus]', (e, el) => { state.status = el.dataset.fstatus; paint(); });
  on(root, 'change', '[data-all]', (e, el) => { filtrar().forEach((p) => (el.checked ? selecionados.add(p.id) : selecionados.delete(p.id))); paintTable(); });
  on(root, 'change', '[data-sel]', (e, el) => { const id = Number(el.dataset.sel); if (el.checked) selecionados.add(id); else selecionados.delete(id); paintBulk(); });
  on(root, 'change', '[data-status]', async (e, el) => {
    const pc = pcs.find((p) => String(p.id) === el.dataset.status);
    el.disabled = true;
    try {
      const upd = await computadores.atualizarStatus(pc, el.value);
      Object.assign(pc, upd);
      toast.success(`${pc.identificador}: ${PC_STATUS[pc.status].label}.`, { title: 'Status atualizado', duration: 2500 });
      refreshNotifications();
      paint();
    } catch (err) {
      el.value = pc.status;
      el.disabled = false;
      showError(err);
    }
  });
  on(root, 'click', '[data-del]', async (e, el) => {
    const pc = pcs.find((p) => String(p.id) === el.dataset.del);
    gerenciarPc(pc, load);
  });
  on(root, 'click', '[data-bulk-status]', (e, el) => {
    const s = el.dataset.bulkStatus;
    aplicarEmMassa((p) => computadores.atualizarStatus(p, s), `marcado(s) como “${PC_STATUS[s].label}”`);
  });
  on(root, 'click', '[data-action=bulk-del]', async () => {
    const ok = await confirmDialog({ title: `Excluir ${plural(selecionados.size, 'computador', 'computadores')}?`, message: 'Esta ação não pode ser desfeita.', confirmLabel: 'Excluir', danger: true });
    if (ok) aplicarEmMassa((p) => computadores.remover(p.id), 'excluído(s)');
  });

  await load();
  if (ctx.query.get('novo') === '1') add();
}
