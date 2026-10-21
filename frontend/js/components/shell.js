// Layout autenticado: sidebar (menu por perfil) + topbar (saudação, notificações, usuário).
import { html, render, createEl, on, $ } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { session, PERFIS, initials, greetingName } from '../core/session.js';
import { navigate, currentPath } from '../core/router.js';
import { confirmDialog } from '../core/ui.js';
import { auth } from '../services/auth.js';
import { loadNotifications } from './notifications.js';

const MENUS = {
  ADMINISTRADOR: [
    { section: 'Menu principal' },
    { path: '/app', label: 'Dashboard', icon: 'dashboard', exact: true },
    { path: '/laboratorios', label: 'Laboratórios', icon: 'building' },
    { path: '/computadores', label: 'Computadores', icon: 'monitor' },
    { path: '/turmas', label: 'Turmas', icon: 'users' },
    { path: '/usuarios', label: 'Usuários', icon: 'userPlus' },
    { section: 'Reservas' },
    { path: '/reservas', label: 'Todas as reservas', icon: 'list' },
    { path: '/grade', label: 'Grade de horários', icon: 'grid' },
  ],
  DOCENTE: [
    { section: 'Menu principal' },
    { path: '/app', label: 'Dashboard', icon: 'dashboard', exact: true },
    { path: '/reservar', label: 'Reservar laboratório', icon: 'plus' },
    { path: '/reservas', label: 'Minhas reservas', icon: 'list' },
    { path: '/grade', label: 'Grade de horários', icon: 'grid' },
    { path: '/turmas', label: 'Turmas', icon: 'users' },
    { path: '/laboratorios', label: 'Laboratórios', icon: 'building' },
  ],
  DISCENTE: [
    { section: 'Menu principal' },
    { path: '/app', label: 'Dashboard', icon: 'dashboard', exact: true },
    { path: '/laboratorios', label: 'Laboratórios', icon: 'building' },
  ],
};

let shellEl = null;
let unsubscribe = null;
let notifCache = null;

function isActive(item, path) {
  if (item.exact) return path === item.path;
  return path === item.path || path.startsWith(item.path + '/');
}

function navHtml(user, path) {
  const items = MENUS[user.perfil] || [];
  return html`
    ${items.map((it) => it.section
      ? html`<p class="nav-label">${it.section}</p>`
      : html`<a class="nav-item ${isActive(it, path) ? 'active' : ''}" href="#${it.path}" data-path="${it.path}" ${it.exact ? 'data-exact' : ''} ${isActive(it, path) ? html`aria-current="page"` : ''}>
          ${icon(it.icon)}<span>${it.label}</span>
        </a>`)}`;
}

function topbarUser(user) {
  const p = PERFIS[user.perfil] || {};
  return html`
    <a class="user-chip" href="#/perfil" title="Meu perfil">
      <span class="user-chip-text"><span class="user-chip-name">${user.nome}</span><span class="user-chip-role">${p.label}</span></span>
      <span class="avatar ${p.avatar}">${initials(user.nome)}</span>
    </a>`;
}

function build(user) {
  const path = currentPath();
  return createEl(html`
    <div class="app">
      <aside class="sidebar" id="sidebar" aria-label="Menu principal">
        <a class="brand" href="#/app"><span class="brand-logo">S</span><span class="brand-name">SisLab</span></a>
        <nav class="nav" data-nav>${navHtml(user, path)}</nav>
        <div class="nav-footer">
          <a class="nav-item ${path === '/configuracoes' ? 'active' : ''}" href="#/configuracoes" data-path="/configuracoes">${icon('settings')}<span>Configurações</span></a>
          <a class="nav-item ${path === '/perfil' ? 'active' : ''}" href="#/perfil" data-path="/perfil">${icon('user')}<span>Perfil</span></a>
          <button class="nav-item danger btnlike" data-action="logout">${icon('logout')}<span>Sair</span></button>
        </div>
      </aside>
      <div class="scrim" data-action="close-nav"></div>
      <div class="main">
        <header class="topbar">
          <button class="icon-btn menu-toggle" data-action="toggle-nav" aria-label="Abrir menu" aria-controls="sidebar">${icon('menu')}</button>
          <span class="topbar-greeting" data-greeting>Olá, <strong>${greetingName(user)}!</strong></span>
          <div class="topbar-actions">
            <div class="relative" data-notif-wrap>
              <button class="icon-btn" data-action="toggle-notif" aria-label="Notificações" aria-haspopup="true">${icon('bell')}<span class="dot" data-notif-dot hidden></span></button>
            </div>
            <span data-user>${topbarUser(user)}</span>
          </div>
        </header>
        <main class="content" id="content" tabindex="-1"></main>
      </div>
    </div>`);
}

function renderNotifPopover(wrap, items) {
  wrap.querySelector('.popover')?.remove();
  const pop = createEl(html`
    <div class="popover" role="dialog" aria-label="Notificações">
      <div class="popover-header"><span>Notificações</span>${items.length ? html`<span class="badge badge-info">${items.length}</span>` : ''}</div>
      <div class="popover-body">
        ${items.length ? items.map((n) => html`
          <${n.href ? 'a' : 'div'} class="notif ${n.href ? 'list-row clickable' : ''}" ${n.href ? html`href="#${n.href}"` : ''} style="${n.href ? 'justify-content:flex-start' : ''}">
            <span class="notif-icon ${n.tone}">${icon(n.icon)}</span>
            <span><span class="notif-title" style="display:block">${n.title}</span><span class="notif-text" style="display:block">${n.text}</span></span>
          </${n.href ? 'a' : 'div'}>`)
          : html`<div class="empty" style="padding:32px 16px"><div class="empty-icon">${icon('checkCircle')}</div><div class="empty-title" style="font-size:13px">Nenhuma notificação</div><p class="empty-text" style="font-size:12px">Está tudo em ordem por aqui.</p></div>`}
      </div>
    </div>`);
  wrap.appendChild(pop);
}

async function refreshNotifications() {
  try {
    notifCache = await loadNotifications();
    const dot = shellEl && $('[data-notif-dot]', shellEl);
    if (dot) dot.hidden = !notifCache.some((n) => n.important);
  } catch { /* notificações são opcionais */ }
}

/** Garante que o shell está montado e retorna o container de conteúdo. */
export function ensureShell(root) {
  const user = session.user;
  if (!shellEl || !root.contains(shellEl)) {
    shellEl = build(user);
    render(root, '');
    root.appendChild(shellEl);
    bind(shellEl);
    unsubscribe?.();
    unsubscribe = session.subscribe((u) => {
      if (!u || !shellEl) return;
      render($('[data-greeting]', shellEl), html`Olá, <strong>${greetingName(u)}!</strong>`);
      render($('[data-user]', shellEl), topbarUser(u));
    });
    refreshNotifications();
  }
  updateActive();
  shellEl.classList.remove('nav-open');
  shellEl.querySelector('.popover')?.remove();
  return $('#content', shellEl);
}

export function destroyShell() {
  unsubscribe?.();
  unsubscribe = null;
  shellEl = null;
  notifCache = null;
}

export { refreshNotifications };

function updateActive() {
  const path = currentPath();
  shellEl.querySelectorAll('.nav-item[data-path]').forEach((a) => {
    const item = { path: a.dataset.path, exact: a.hasAttribute('data-exact') };
    const active = isActive(item, path);
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

function bind(el) {
  on(el, 'click', '[data-action=toggle-nav]', () => el.classList.toggle('nav-open'));
  on(el, 'click', '[data-action=close-nav]', () => el.classList.remove('nav-open'));
  on(el, 'click', '[data-action=logout]', async () => {
    const ok = await confirmDialog({ title: 'Sair do SisLab?', message: 'Você precisará entrar novamente para acessar o sistema.', confirmLabel: 'Sair', iconName: 'logout' });
    if (!ok) return;
    auth.logout();
    destroyShell();
    navigate('/login');
  });
  on(el, 'click', '[data-action=toggle-notif]', async (e) => {
    e.stopPropagation();
    const wrap = $('[data-notif-wrap]', el);
    if (wrap.querySelector('.popover')) { wrap.querySelector('.popover').remove(); return; }
    renderNotifPopover(wrap, notifCache || []);
    await refreshNotifications();
    if (wrap.querySelector('.popover')) renderNotifPopover(wrap, notifCache || []);
  });
  document.addEventListener('click', (e) => {
    if (!shellEl) return;
    const wrap = $('[data-notif-wrap]', shellEl);
    if (wrap && !wrap.contains(e.target)) wrap.querySelector('.popover')?.remove();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && shellEl) {
      shellEl.querySelector('.popover')?.remove();
      shellEl.classList.remove('nav-open');
    }
  });
}
