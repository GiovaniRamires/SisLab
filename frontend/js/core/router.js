// Roteador SPA baseado em hash (#/rota/:param), com guardas de autenticação e perfil.
import { session } from './session.js';

const routes = [];
let notFoundView = null;
let currentCleanup = null;
let navId = 0;
const hooks = { before: [], after: [] };

/**
 * Registra uma rota.
 * def: { view: async (ctx) => cleanup?, layout: 'public'|'app'|'auth', auth: bool, roles: [...], title, nav }
 */
export function route(pattern, def) {
  const keys = [];
  const regex = new RegExp('^' + pattern.replace(/\/:(\w+)/g, (_, k) => { keys.push(k); return '/([^/]+)'; }) + '/?$');
  routes.push({ pattern, regex, keys, ...def });
}

export function setNotFound(view) { notFoundView = view; }

export function onBeforeNavigate(fn) { hooks.before.push(fn); }
export function onAfterNavigate(fn) { hooks.after.push(fn); }

export function navigate(path, { replace = false } = {}) {
  const hash = '#' + (path.startsWith('/') ? path : '/' + path);
  if (location.hash === hash) return resolve();
  if (replace) history.replaceState(null, '', hash);
  else location.hash = hash;
  if (replace) resolve();
}

export function currentPath() {
  return (location.hash.slice(1) || '/').split('?')[0];
}

export function currentQuery() {
  return new URLSearchParams(location.hash.split('?')[1] || '');
}

function match(path) {
  for (const r of routes) {
    const m = r.regex.exec(path);
    if (m) {
      const params = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      return { route: r, params };
    }
  }
  return null;
}

/** Retorna a rota inicial do usuário logado. */
export const homePath = () => (session.isAuthenticated ? '/app' : '/');

async function resolve() {
  const id = ++navId;
  const path = currentPath();
  const found = match(path);

  if (found) {
    const { route: r } = found;
    if (r.auth && !session.isAuthenticated) {
      sessionStorage.setItem('sislab.redirect', path);
      return navigate('/login', { replace: true });
    }
    if (r.guestOnly && session.isAuthenticated) return navigate('/app', { replace: true });
    if (r.roles && !r.roles.includes(session.perfil)) return navigate('/app', { replace: true });
  }

  for (const fn of hooks.before) await fn(found?.route || null, path);
  if (id !== navId) return; // navegação mais recente em andamento

  try { currentCleanup?.(); } catch (e) { console.error(e); }
  currentCleanup = null;

  const r = found?.route || { view: notFoundView, layout: session.isAuthenticated ? 'app' : 'public', title: 'Página não encontrada' };
  const ctx = { params: found?.params || {}, query: currentQuery(), path, route: r, isCurrent: () => id === navId };

  for (const fn of hooks.after) await fn(r, ctx);
  if (id !== navId) return;

  document.title = r.title ? `${r.title} · SisLab` : 'SisLab — Gestão de Laboratórios';
  const cleanup = await r.view(ctx);
  if (id === navId && typeof cleanup === 'function') currentCleanup = cleanup;
}

export function startRouter() {
  window.addEventListener('hashchange', resolve);
  resolve();
}

export function refresh() { return resolve(); }
