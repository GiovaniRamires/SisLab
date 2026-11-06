// Endpoints: /reserva e /reserva/{id}/alocacoes
import { api } from '../core/api.js';
import { cached, invalidate } from './cache.js';
import { toDateTime } from '../core/format.js';

/** Situação temporal da reserva: futura, em andamento ou encerrada. */
export function situacao(r, now = new Date()) {
  if (r.status === 'CANCELADA') return 'CANCELADA';
  const ini = toDateTime(r.data, r.horaInicio);
  const fim = toDateTime(r.data, r.horaFim);
  if (now >= fim) return 'ENCERRADA';
  if (now >= ini) return 'EM_ANDAMENTO';
  return 'AGENDADA';
}

export const SITUACAO = {
  AGENDADA: { label: 'Confirmada', badge: 'success' },
  EM_ANDAMENTO: { label: 'Em andamento', badge: 'info' },
  ENCERRADA: { label: 'Realizada', badge: 'neutral' },
  CANCELADA: { label: 'Cancelada', badge: 'danger' },
};

export const ordenarPorInicio = (a, b) => toDateTime(a.data, a.horaInicio) - toDateTime(b.data, b.horaInicio);

export const reservas = {
  // GET /reserva — o backend filtra por perfil (admin: todas; docente: as suas).
  listar() {
    return cached('reservas', async () => ((await api.get('/reserva')) || []).sort(ordenarPorInicio));
  },
  buscar(id) {
    return api.get(`/reserva/${id}`);
  },
  async criar({ laboratorioId, turmaId, data, horaInicio, horaFim, justificativa }) {
    const r = await api.post('/reserva', {
      laboratorioId: Number(laboratorioId),
      turmaId: Number(turmaId),
      data, horaInicio, horaFim,
      justificativa: justificativa || null,
    });
    invalidate('reservas');
    return r;
  },
  /** Próximas reservas (agendadas ou em andamento), em ordem cronológica. */
  async proximas() {
    return (await this.listar()).filter((r) => ['AGENDADA', 'EM_ANDAMENTO'].includes(situacao(r)));
  },
  /** Cancela a reserva (DELETE /reserva/{id}). O backend marca como CANCELADA. */
  async cancelar(id) {
    await api.del(`/reserva/${id}`);
    invalidate('reservas');
  },
};

/* Alocação de alunos em máquinas: /reserva/{id}/alocacoes */
export const alocacoesAcoes = {
  /** Realoca um aluno já alocado para outra máquina (ex.: o PC atual quebrou). */
  mover(reservaId, alunoId, maquinaId) {
    return api.put(`/reserva/${reservaId}/alocacoes/${alunoId}`, { maquinaId: Number(maquinaId) });
  },
  /** Remove a alocação de um aluno (libera a estação). */
  desalocar(reservaId, alunoId) {
    return api.del(`/reserva/${reservaId}/alocacoes/${alunoId}`);
  },
};

/** Verifica sobreposição de horário entre uma reserva e um intervalo. */
export function conflita(r, data, ini, fim) {
  if (r.status === 'CANCELADA' || r.data !== data) return false;
  const a = r.horaInicio.slice(0, 5);
  const b = r.horaFim.slice(0, 5);
  return a < fim && ini < b;
}

/* Alocação de alunos em máquinas: /reserva/{id}/alocacoes (ADM ou docente dono consultam; só o dono aloca). */
export const alocacoes = {
  async listar(reservaId) {
    return (await api.get(`/reserva/${reservaId}/alocacoes`)) || [];
  },
  alocar(reservaId, alunoId, maquinaId) {
    return api.post(`/reserva/${reservaId}/alocacoes`, { alunoId: Number(alunoId), maquinaId: Number(maquinaId) });
  },
};
