// Endpoints: /laboratorio e /computador
import { api } from '../core/api.js';
import { cached, invalidate } from './cache.js';
import { naturalCompare } from '../core/format.js';

export const PC_STATUS = {
  ATIVO: { label: 'Ativo', map: 'Disponível', badge: 'success', cls: '', icon: 'checkCircle' },
  EM_MANUTENCAO: { label: 'Em manutenção', map: 'Manutenção', badge: 'warning', cls: 'maintenance', icon: 'wrench' },
  DESATIVADO: { label: 'Desativado', map: 'Desativado', badge: 'danger', cls: 'disabled', icon: 'power' },
};

const sortLabs = (a, b) => naturalCompare(a.nome, b.nome);
const sortPcs = (a, b) => naturalCompare(a.identificador, b.identificador);

export const laboratorios = {
  listar() {
    return cached('labs', async () => ((await api.get('/laboratorio', { auth: false })) || []).sort(sortLabs));
  },
  buscar(id) {
    return api.get(`/laboratorio/${id}`, { auth: false });
  },
  async criar({ nome, bloco }) {
    const r = await api.post('/laboratorio', { nome, bloco });
    invalidate('labs');
    return r;
  },
  async atualizar(id, { nome, bloco }) {
    const r = await api.put(`/laboratorio/${id}`, { nome, bloco });
    invalidate('labs', 'pcs');
    return r;
  },
  async remover(id) {
    await api.del(`/laboratorio/${id}`);
    invalidate('labs', 'pcs');
  },

  /** Laboratórios com estatísticas dos computadores agregadas. */
  async listarComResumo() {
    const [labs, pcs] = await Promise.all([this.listar(), computadores.listar()]);
    return labs.map((lab) => resumoLab(lab, pcs.filter((p) => p.laboratorio?.id === lab.id)));
  },
};

export function resumoLab(lab, pcs) {
  const count = (s) => pcs.filter((p) => p.status === s).length;
  return {
    ...lab,
    pcs,
    total: pcs.length,
    ativos: count('ATIVO'),
    manutencao: count('EM_MANUTENCAO'),
    desativados: count('DESATIVADO'),
  };
}

export const computadores = {
  listar() {
    return cached('pcs', async () => ((await api.get('/computador', { auth: false })) || []).sort(sortPcs));
  },
  async porLaboratorio(labId) {
    return (await this.listar()).filter((p) => String(p.laboratorio?.id) === String(labId));
  },
  async criar({ identificador, status = 'ATIVO', laboratorioId }) {
    const r = await api.post('/computador', { identificador, status, laboratorioId: Number(laboratorioId) });
    invalidate('pcs');
    return r;
  },
  /** O PUT exige o DTO completo, embora o backend só altere o status. */
  async atualizarStatus(pc, status) {
    const r = await api.put(`/computador/${pc.id}`, {
      identificador: pc.identificador, status, laboratorioId: pc.laboratorio?.id,
    });
    invalidate('pcs');
    return r;
  },
  async remover(id) {
    await api.del(`/computador/${id}`);
    invalidate('pcs');
  },
};
