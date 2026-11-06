// Endpoints do painel do discente (o discente acessa o sistema apenas por aqui).
import { api } from '../core/api.js';

export const aluno = {
  /** Próxima aula do discente logado (ou null quando não há aula futura: 204). */
  async proximaAula() {
    return (await api.get('/aluno/proxima-aula')) || null;
  },
  /** Reservas futuras do discente (onde ele está alocado), em ordem cronológica. */
  async minhasReservas() {
    return (await api.get('/aluno/minhas-reservas')) || [];
  },
  /** Mapa de um laboratório onde o discente tem aula (403 se não tiver). */
  async mapaLaboratorio(id) {
    return (await api.get(`/aluno/laboratorios/${id}/mapa`)) || [];
  },
};
