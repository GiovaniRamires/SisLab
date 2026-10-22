// Configuração global do front-end.
// A URL da API pode ser alterada pela tela "Configurações" (salva no localStorage)
// ou definindo window.SISLAB_API_URL antes de carregar o app.
const STORAGE_KEY = 'sislab.apiUrl';
const DEFAULT_API_URL = window.SISLAB_API_URL || 'http://localhost:8080';

export const config = {
  get apiUrl() {
    return (localStorage.getItem(STORAGE_KEY) || DEFAULT_API_URL).replace(/\/+$/, '');
  },
  set apiUrl(value) {
    const v = (value || '').trim().replace(/\/+$/, '');
    if (!v || v === DEFAULT_API_URL) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, v);
  },
  defaultApiUrl: DEFAULT_API_URL,
  appName: 'SisLab',
  /** Tempo (ms) que listas carregadas da API ficam em cache em memória. */
  cacheTtl: 30_000,

  /*
   * Autenticação (Spring Security + JWT).
   * - login:  POST { email, senha } -> { token, id, nome, email, rgm, perfil }
   *           O token é enviado em "Authorization: Bearer" em todas as requisições autenticadas.
   * - logout: POST, chamado ao sair (falhas são ignoradas). O JWT é stateless: o token é descartado no cliente.
   * - csrf:   o backend não usa cookies de sessão (CSRF desativado); o suporte abaixo só entra em ação
   *           se algum dia existir o cookie XSRF-TOKEN.
   */
  auth: {
    loginPath: '/auth/login',
    logoutPath: '/auth/logout',
    csrfCookie: 'XSRF-TOKEN',
    csrfHeader: 'X-XSRF-TOKEN',
  },
};
