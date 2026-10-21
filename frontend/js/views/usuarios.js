// Usuários (ADM): listagem por perfil, cadastro, edição e exclusão.
import { html, render, on, $, debounce, showFieldErrors } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { session, PERFIS } from '../core/session.js';
import { toast, showError, formModal, confirmDialog, errorState, emptyState } from '../core/ui.js';
import { normalize } from '../core/format.js';
import { usuarios } from '../services/usuarios.js';
import { invalidate } from '../services/cache.js';
import { pageHeader, skeletonRows, userAvatar, perfilBadge } from '../components/common.js';
import { userFields, validateUser, explainConflict } from './cadastro.js';

const state = { aba: 'TODOS', busca: '' };

export default async function usuariosView(ctx) {
  const { root } = ctx;
  let lista = [];

  const header = pageHeader({
    title: 'Usuários',
    subtitle: 'Administradores, docentes e discentes com acesso ao SisLab.',
    actions: html`<button class="btn btn-primary" data-action="novo">${icon('userPlus')} Novo usuário</button>`,
  });

  function paintTable() {
    const q = normalize(state.busca);
    const itens = lista.filter((u) => (state.aba === 'TODOS' || u.perfil === state.aba) && (!q || normalize(`${u.nome} ${u.email} ${u.rgm}`).includes(q)));
    render($('[data-table]', root), itens.length ? html`
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Nome</th><th>E-mail</th><th>RGM</th><th>Perfil</th><th class="right">Ações</th></tr></thead>
        <tbody>
          ${itens.map((u) => html`
            <tr>
              <td><div class="row" style="gap:10px">${userAvatar(u)}<span class="fw-500" style="color:var(--text)">${u.nome}</span>${u.id === session.user.id ? html`<span class="badge badge-neutral">Você</span>` : ''}</div></td>
              <td>${u.email}</td>
              <td class="mono text-sm">${u.rgm}</td>
              <td>${perfilBadge(u.perfil)}</td>
              <td><div class="actions">
                <button class="btn btn-ghost btn-icon btn-sm" data-edit="${u.id}" title="Editar" aria-label="Editar ${u.nome}">${icon('edit')}</button>
                <button class="btn btn-ghost btn-icon btn-sm" data-del="${u.id}" title="Excluir" aria-label="Excluir ${u.nome}" style="--btn-fg:var(--danger-strong)" ${u.id === session.user.id ? 'disabled' : ''}>${icon('trash')}</button>
              </div></td>
            </tr>`)}
        </tbody>
      </table></div>
      <div class="card-footer text-xs muted">${itens.length} usuário(s)</div>`
      : emptyState({ iconName: 'users', title: 'Nenhum usuário encontrado', text: 'Ajuste a busca ou cadastre um novo usuário.' }));
  }

  function paint() {
    const count = (p) => (p === 'TODOS' ? lista.length : lista.filter((u) => u.perfil === p).length);
    const abas = [['TODOS', 'Todos'], ['DOCENTE', 'Docentes'], ['DISCENTE', 'Discentes'], ['ADMINISTRADOR', 'Administradores']];
    render(root, html`
      <div class="page wide">
        ${header}
        <div class="card">
          <div class="tabs" role="tablist">
            ${abas.map(([k, label]) => html`<button class="tab ${state.aba === k ? 'active' : ''}" role="tab" aria-selected="${state.aba === k}" data-aba="${k}">${label} <span class="badge ${state.aba === k ? 'badge-info' : 'badge-neutral'}">${count(k)}</span></button>`)}
          </div>
          <div style="padding:16px 24px;border-bottom:1px solid var(--border)">
            <div class="input-icon" style="max-width:420px">${icon('search')}<input class="input input-sm" type="search" placeholder="Buscar por nome, e-mail ou RGM..." value="${state.busca}" data-busca aria-label="Buscar"></div>
          </div>
          <div data-table></div>
        </div>
      </div>`);
    paintTable();
  }

  async function load() {
    invalidate('usuarios:');
    render(root, html`<div class="page wide">${header}${skeletonRows(6)}</div>`);
    try {
      lista = await usuarios.listarTodos();
      if (ctx.isCurrent()) paint();
    } catch (err) {
      render(root, html`<div class="page wide">${header}<div class="card">${errorState(err)}</div></div>`);
    }
  }

  async function salvar(data, form, atual) {
    if (showFieldErrors(form, validateUser(data, form))) return false;
    data.perfil ||= atual?.perfil;
    try {
      return atual ? await usuarios.atualizar(atual.id, data) : await usuarios.cadastrar(data);
    } catch (err) {
      if (err.status === 409) {
        const errs = await explainConflict(data, atual?.id);
        if (showFieldErrors(form, errs)) err.message = 'E-mail ou RGM já cadastrado.';
      }
      throw err;
    }
  }

  const novo = async () => {
    const r = await formModal({
      title: 'Novo usuário', iconName: 'userPlus', submitLabel: 'Cadastrar', size: 'lg',
      fields: userFields({ perfil: state.aba !== 'TODOS' ? state.aba : 'DISCENTE' }),
      onSubmit: (d, f) => salvar(d, f),
    });
    if (r && r !== true) { toast.success(`${r.nome} cadastrado como ${PERFIS[r.perfil].label.toLowerCase()}.`, { title: 'Usuário criado' }); load(); }
  };

  on(root, 'click', '[data-action=novo]', novo);
  on(root, 'click', '[data-action=retry]', load);
  on(root, 'click', '[data-aba]', (e, el) => { state.aba = el.dataset.aba; paint(); });
  on(root, 'input', '[data-busca]', debounce((e) => { state.busca = e.target.value; paintTable(); }, 120));
  on(root, 'click', '[data-edit]', async (e, el) => {
    const u = lista.find((x) => String(x.id) === el.dataset.edit);
    const self = u.id === session.user.id;
    const r = await formModal({
      title: 'Editar usuário', description: self ? 'Você está editando sua própria conta.' : `ID ${u.id}`, iconName: 'edit', size: 'lg',
      fields: userFields(u, { perfilEditable: !self }),
      onSubmit: (d, f) => salvar(d, f, u),
    });
    if (r && r !== true) {
      if (self) session.update({ nome: r.nome, email: r.email, rgm: r.rgm });
      toast.success('Dados atualizados.', { title: 'Usuário salvo' });
      load();
    }
  });
  on(root, 'click', '[data-del]', async (e, el) => {
    const u = lista.find((x) => String(x.id) === el.dataset.del);
    const ok = await confirmDialog({ title: `Excluir ${u.nome}?`, message: 'O usuário perderá o acesso ao sistema. Esta ação não pode ser desfeita.', confirmLabel: 'Excluir', danger: true });
    if (!ok) return;
    try {
      await usuarios.remover(u.id);
      toast.success(`${u.nome} foi excluído.`, { title: 'Usuário excluído' });
      load();
    } catch (err) {
      if (err.status === 409) toast.error('Este usuário está vinculado a turmas ou reservas e não pode ser excluído.', { title: 'Exclusão bloqueada' });
      else showError(err);
    }
  });

  await load();
  if (ctx.query.get('novo') === '1') novo();
}
