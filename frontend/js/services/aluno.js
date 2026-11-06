// Endpoint do painel do discente: GET /aluno/proxima-aula
import { api } from '../core/api.js';

export const aluno = {
  /** Próxima aula do discente logado (ou null quando não há aula futura: 204). */
  async proximaAula() {
    return (await api.get('/aluno/proxima-aula')) || null;
  },
};
