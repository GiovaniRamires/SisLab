// Endpoints: /reserva e /reserva/{id}/alocacoes
import { api, ApiError } from '../core/api.js';
import { cached, invalidate } from './cache.js';
import { toDateTime } from '../core/format.js';

/*
 * O backend ainda não expõe uma listagem (GET /reserva). Para montar "Minhas reservas",
 * a grade e o dashboard, o front percorre os IDs sequenciais via GET /reserva/{id}:
 *   200 -> reserva visível ao usuário | 403 -> existe, mas é de outro docente | 404 -> não existe
 * A varredura para após MAX_MISSES IDs inexistentes consecutivos. Quando o endpoint de
 * listagem existir, basta trocar a implementação de `listar()`.
 */
const BATCH = 10;
const MAX_MISSES = 10;
const MAX_ID = 10_000;

async function varrerReservas() {
  const encontradas = [];
  let id = 1;
  let misses = 0;
  while (misses < MAX_MISSES && id < MAX_ID) {
    const ids = Array.from({ length: BATCH }, (_, i) => id + i);
    id += BATCH;
    const results = await Promise.all(ids.map((i) => api.get(`/reserva/${i}`).then(
      (data) => ({ data }),
      (error) => ({ error }),
    )));
    for (const r of results) {
      if (r.data) { encontradas.push(r.data); misses = 0; }
      else if (r.error instanceof ApiError && r.error.status === 403) misses = 0;
      else if (r.error instanceof ApiError && r.error.status === 404) misses++;
      else throw r.error;
      if (misses >= MAX_MISSES) break;
    }
  }
  return encontradas;
}

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
  listar() {
    return cached('reservas', async () => (await varrerReservas()).sort(ordenarPorInicio));
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
};

/** Verifica sobreposição de horário entre uma reserva e um intervalo. */
export function conflita(r, data, ini, fim) {
  if (r.status === 'CANCELADA' || r.data !== data) return false;
  const a = r.horaInicio.slice(0, 5);
  const b = r.horaFim.slice(0, 5);
  return a < fim && ini < b;
}

/*
 * Alocação de alunos em máquinas (PR "feature/alocacao").
 * Se o endpoint não existir no backend, `listar` retorna { disponivel: false }.
 */
export const alocacoes = {
  async listar(reservaId) {
    try {
      const itens = await api.get(`/reserva/${reservaId}/alocacoes`);
      return { disponivel: true, itens: itens || [] };
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 405)) return { disponivel: false, itens: [] };
      throw err;
    }
  },
  alocar(reservaId, alunoId, maquinaId) {
    return api.post(`/reserva/${reservaId}/alocacoes`, { alunoId: Number(alunoId), maquinaId: Number(maquinaId) });
  },
};
