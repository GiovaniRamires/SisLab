// Autenticação.
// O backend identifica o usuário pelo header "idUsuario" (não há token).
// Login: usa POST /auth/login { email, rgm } (PR "feature-login"). Se o endpoint ainda não
// existir no servidor (404/405), faz a validação equivalente a partir das listagens de usuários.
import { api, ApiError } from '../core/api.js';
import { session } from '../core/session.js';
import { usuarios } from './usuarios.js';
import { invalidate } from './cache.js';
import { normalize } from '../core/format.js';

const INVALID = 'E-mail ou RGM inválidos.';

async function loginViaListagem(email, rgm) {
  invalidate('usuarios:');
  const todos = await usuarios.listarTodos();
  const e = normalize(email);
  const user = todos.find((u) => normalize(u.email) === e && String(u.rgm).trim() === rgm);
  if (!user) throw new ApiError({ status: 401, message: INVALID });
  return user;
}

export const auth = {
  async login(email, rgm, remember = true) {
    email = email.trim();
    rgm = rgm.trim();
    let user;
    try {
      const res = await api.post('/auth/login', { email, rgm }, { auth: false });
      // LoginRespostaDTO: { id, nome, perfil } — completa com e-mail e RGM informados
      user = { ...res, email, rgm };
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
        user = await loginViaListagem(email, rgm);
      } else if (err instanceof ApiError && (err.status === 401 || err.status === 400) && !err.fieldErrors) {
        throw new ApiError({ status: 401, message: INVALID });
      } else {
        throw err;
      }
    }
    invalidate();
    session.login(user, remember);
    return user;
  },

  logout() {
    invalidate();
    session.logout();
  },
};
