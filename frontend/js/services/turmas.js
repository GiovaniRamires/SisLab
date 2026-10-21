// Endpoints: /turma
import { api } from '../core/api.js';
import { cached, invalidate } from './cache.js';
import { naturalCompare } from '../core/format.js';

export const turmas = {
  /** ADM: todas | DOCENTE: as próprias | DISCENTE: 403. */
  listar() {
    return cached('turmas', async () => ((await api.get('/turma')) || []).sort((a, b) => naturalCompare(a.nome, b.nome)));
  },
  buscar(id) {
    return cached(`turmas:${id}`, () => api.get(`/turma/${id}`));
  },
  async criar({ nome, disciplina, docenteId }) {
    const r = await api.post('/turma', { nome, disciplina, docenteId: Number(docenteId) });
    invalidate('turmas');
    return r;
  },
  async matricular(turmaId, alunoId) {
    const r = await api.post(`/turma/${turmaId}/alunos`, { alunoId: Number(alunoId) });
    invalidate('turmas');
    return r;
  },
};
