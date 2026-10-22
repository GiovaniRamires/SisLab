// Endpoints: /usuario
import { api } from '../core/api.js';
import { cached, invalidate } from './cache.js';
import { naturalCompare } from '../core/format.js';

const LIST_PATH = {
  DOCENTE: '/usuario/listaDocente',
  DISCENTE: '/usuario/listaDiscente',
  ADMINISTRADOR: '/usuario/listaAdm',
};

const byName = (a, b) => naturalCompare(a.nome, b.nome);

export const usuarios = {
  /** Lista usuários de um perfil (DOCENTE | DISCENTE | ADMINISTRADOR). */
  listar(perfil) {
    return cached(`usuarios:${perfil}`, async () => ((await api.get(LIST_PATH[perfil])) || []).sort(byName));
  },

  async listarTodos() {
    const [adm, doc, dis] = await Promise.all([
      this.listar('ADMINISTRADOR'), this.listar('DOCENTE'), this.listar('DISCENTE'),
    ]);
    return [...adm, ...doc, ...dis];
  },

  /** Não existe GET /usuario/{id}; busca nas listagens por perfil. */
  async buscarPorId(id) {
    const todos = await this.listarTodos();
    return todos.find((u) => String(u.id) === String(id)) || null;
  },

  /** POST /usuario/cadastrar (público). */
  async cadastrar({ nome, email, rgm, perfil }) {
    const u = await api.post('/usuario/cadastrar', { nome, email, rgm, perfil }, { auth: false });
    invalidate('usuarios:');
    return u;
  },

  async atualizar(id, { nome, email, rgm, perfil }) {
    const u = await api.put(`/usuario/${id}`, { nome, email, rgm, perfil });
    invalidate('usuarios:', 'turmas');
    return u;
  },

  async remover(id) {
    await api.del(`/usuario/${id}`);
    invalidate('usuarios:', 'turmas');
  },
};
