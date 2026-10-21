// Sessão do usuário autenticado (persistida em localStorage ou sessionStorage).
const KEY = 'sislab.session';
const listeners = new Set();

function read() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || localStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
}

let current = read();

export const PERFIS = {
  ADMINISTRADOR: { label: 'Administrador', short: 'Admin', icon: 'shield', avatar: 'purple' },
  DOCENTE: { label: 'Docente', short: 'Docente', icon: 'graduation', avatar: '' },
  DISCENTE: { label: 'Discente', short: 'Discente', icon: 'book', avatar: 'success' },
};

export const session = {
  get user() { return current; },
  get isAuthenticated() { return !!current; },
  get perfil() { return current?.perfil; },
  get isAdmin() { return current?.perfil === 'ADMINISTRADOR'; },
  get isDocente() { return current?.perfil === 'DOCENTE'; },
  get isDiscente() { return current?.perfil === 'DISCENTE'; },

  /** Inicia a sessão. remember=true mantém após fechar o navegador. */
  login(user, remember = true) {
    current = { id: user.id, nome: user.nome, email: user.email, rgm: user.rgm, perfil: user.perfil };
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
    (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(current));
    listeners.forEach((fn) => fn(current));
  },

  /** Atualiza dados do usuário logado (ex.: após editar o perfil). */
  update(patch) {
    if (!current) return;
    current = { ...current, ...patch };
    const store = localStorage.getItem(KEY) ? localStorage : sessionStorage;
    store.setItem(KEY, JSON.stringify(current));
    listeners.forEach((fn) => fn(current));
  },

  logout() {
    current = null;
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
    listeners.forEach((fn) => fn(null));
  },

  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

export function firstName(nome = '') {
  return nome.trim().split(/\s+/)[0] || '';
}

export function initials(nome = '') {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Saudação do topo, no estilo do protótipo ("Professor Carlos"). */
export function greetingName(user) {
  if (!user) return '';
  const n = firstName(user.nome);
  if (user.perfil === 'DOCENTE') return `Professor(a) ${n}`;
  return n;
}
