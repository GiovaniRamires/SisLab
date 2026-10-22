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
   * Autenticação (Spring Security).
   * - login:  POST { email, rgm } -> { id, nome, perfil, [token] }
   *           Se a resposta trouxer um token (token | accessToken | jwt), ele é enviado
   *           em "Authorization: Bearer"; caso contrário vale o cookie de sessão (JSESSIONID).
   * - logout: POST, chamado ao sair (falhas são ignoradas).
   * - csrf:   se o backend usar CookieCsrfTokenRepository (ex.: csrf.spa()), o valor do cookie
   *           é reenviado no header abaixo nas requisições que alteram dados.
   */
  auth: {
    loginPath: '/auth/login',
    logoutPath: '/auth/logout',
    csrfCookie: 'XSRF-TOKEN',
    csrfHeader: 'X-XSRF-TOKEN',
  },
};
