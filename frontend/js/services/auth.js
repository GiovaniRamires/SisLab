// Autenticação via Spring Security + JWT.
// POST /auth/login { email, senha } devolve o token JWT e os dados do usuário.
// O front guarda o token e os dados exibidos na interface.
import { api, ApiError } from '../core/api.js';
import { config } from '../config.js';
import { session } from '../core/session.js';
import { invalidate } from './cache.js';

const INVALID = 'E-mail ou senha inválidos.';

/** Extrai um token da resposta do login, se o backend usar JWT. */
function extrairToken(res) {
  return res?.token || res?.accessToken || res?.access_token || res?.jwt || null;
}

export const auth = {
  async login(email, senha, remember = true) {
    email = email.trim();
    senha = senha.trim();
    let res;
    try {
      res = await api.post(config.auth.loginPath, { email, senha }, { auth: false });
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || (err.status === 400 && !err.fieldErrors))) {
        throw new ApiError({ status: 401, message: INVALID, path: err.path });
      }
      if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
        throw new ApiError({ status: err.status, message: `O servidor não possui o endpoint de login (${config.auth.loginPath}).`, path: err.path });
      }
      throw err;
    }
    // LoginRespostaDTO: { token, id, nome, email, rgm, perfil }
    const user = { ...res, token: extrairToken(res) };
    invalidate();
    session.login(user, remember);
    return user;
  },

  /** Encerra a sessão no servidor (melhor esforço) e localmente. */
  async logout() {
    if (session.isAuthenticated) {
      // auth:false evita que um 401 aqui dispare o aviso de "sessão expirada"; o cookie vai mesmo assim.
      const token = session.user?.token;
      try {
        await api.post(config.auth.logoutPath, undefined, { auth: false, headers: token ? { Authorization: `Bearer ${token}` } : {} });
      } catch { /* ignora */ }
    }
    invalidate();
    session.logout();
  },

  /** Encerra apenas a sessão local (usado quando o servidor responde 401). */
  expire() {
    invalidate();
    session.logout();
  },
};
