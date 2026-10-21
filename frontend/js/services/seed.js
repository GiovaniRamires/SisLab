// Popula o backend (H2 em memória) com dados de demonstração.
// Útil em desenvolvimento: o banco começa vazio a cada reinício do servidor.
import { api } from '../core/api.js';
import { invalidate } from './cache.js';
import { toISODate, addDays } from '../core/format.js';

export const DEMO_USERS = {
  admin: { nome: 'Administrador SisLab', email: 'admin@instituicao.edu.br', rgm: '00000001', perfil: 'ADMINISTRADOR' },
  docente: { nome: 'Carlos Andrade', email: 'carlos@instituicao.edu.br', rgm: '20240001', perfil: 'DOCENTE' },
  docente2: { nome: 'Ana Lima', email: 'ana.lima@instituicao.edu.br', rgm: '20240002', perfil: 'DOCENTE' },
  discente: { nome: 'João Pereira', email: 'joao@aluno.instituicao.edu.br', rgm: '20250001', perfil: 'DISCENTE' },
};

const ALUNOS = [
  'João Pereira', 'Maria Souza', 'Ana Oliveira', 'Lucas Santos', 'Pedro Henrique', 'Gabriel Lima',
  'Fernanda Costa', 'Rafael Moreira', 'Juliana Alves', 'Thiago Nunes', 'Camila Torres', 'Diego Ferreira',
  'Beatriz Rocha', 'Mateus Carvalho',
];

const LABS = [
  { nome: 'Laboratório 01', bloco: 'Bloco A', pcs: 20, manutencao: [4], desativado: [8] },
  { nome: 'Laboratório 02', bloco: 'Bloco A', pcs: 25, manutencao: [3, 11], desativado: [] },
  { nome: 'Laboratório 03', bloco: 'Bloco B', pcs: 20, manutencao: [], desativado: [] },
  { nome: 'Laboratório 04', bloco: 'Bloco C', pcs: 10, manutencao: [], desativado: [5] },
];

const slug = (nome) => nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.');

/** Executa promessas em lotes para não sobrecarregar o servidor. */
async function inBatches(items, size, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...await Promise.all(items.slice(i, i + size).map((item, j) => fn(item, i + j))));
  }
  return out;
}

export async function seedDemo(onProgress = () => {}) {
  const as = (id) => ({ auth: false, headers: { idUsuario: String(id) } });
  const cadastrar = (u) => api.post('/usuario/cadastrar', u, { auth: false });

  onProgress('Criando usuários...');
  const admin = await cadastrar(DEMO_USERS.admin);
  const carlos = await cadastrar(DEMO_USERS.docente);
  const ana = await cadastrar(DEMO_USERS.docente2);
  const alunos = await inBatches(ALUNOS, 5, (nome, i) => cadastrar({
    nome,
    email: i === 0 ? DEMO_USERS.discente.email : `${slug(nome)}@aluno.instituicao.edu.br`,
    rgm: String(20250001 + i),
    perfil: 'DISCENTE',
  }));

  onProgress('Criando laboratórios e computadores...');
  const labs = [];
  for (const def of LABS) {
    const lab = await api.post('/laboratorio', { nome: def.nome, bloco: def.bloco }, as(admin.id));
    labs.push(lab);
    const pcs = Array.from({ length: def.pcs }, (_, i) => i + 1);
    await inBatches(pcs, 10, (n) => api.post('/computador', {
      identificador: `PC ${String(n).padStart(2, '0')}`,
      status: def.manutencao.includes(n) ? 'EM_MANUTENCAO' : def.desativado.includes(n) ? 'DESATIVADO' : 'ATIVO',
      laboratorioId: lab.id,
    }, as(admin.id)));
  }

  onProgress('Criando turmas e matrículas...');
  const t1 = await api.post('/turma', { nome: 'ADS — 3º Semestre', disciplina: 'Programação Orientada a Objetos', docenteId: carlos.id }, as(admin.id));
  const t2 = await api.post('/turma', { nome: 'ADS — 1º Semestre', disciplina: 'Algoritmos e Estruturas de Dados', docenteId: carlos.id }, as(admin.id));
  const t3 = await api.post('/turma', { nome: 'SI — 2º Semestre', disciplina: 'Banco de Dados', docenteId: ana.id }, as(admin.id));
  const matricular = (t, list) => inBatches(list, 1, (a) => api.post(`/turma/${t.id}/alunos`, { alunoId: a.id }, as(admin.id)));
  await matricular(t1, alunos.slice(0, 12));
  await matricular(t2, alunos.slice(6, 14));
  await matricular(t3, alunos.slice(0, 8));

  onProgress('Criando reservas de exemplo...');
  const hoje = new Date();
  const reservasDemo = [
    { lab: labs[0], turma: t1, docente: carlos, dia: 1, ini: '19:00', fim: '21:00', just: 'Aula prática de herança e polimorfismo' },
    { lab: labs[2], turma: t2, docente: carlos, dia: 3, ini: '17:00', fim: '19:00', just: 'Lista de exercícios de vetores' },
    { lab: labs[1], turma: t3, docente: ana, dia: 1, ini: '19:00', fim: '21:00', just: 'Modelagem relacional' },
    { lab: labs[0], turma: t1, docente: carlos, dia: 8, ini: '19:00', fim: '21:00', just: 'Projeto em grupo' },
  ];
  const criadas = [];
  for (const r of reservasDemo) {
    criadas.push(await api.post('/reserva', {
      laboratorioId: r.lab.id, turmaId: r.turma.id,
      data: toISODate(addDays(hoje, r.dia)), horaInicio: r.ini, horaFim: r.fim, justificativa: r.just,
    }, as(r.docente.id)));
  }

  // Alocações de exemplo (somente se o módulo de alocação existir no backend)
  try {
    const pcsLab1 = (await api.get('/computador', { auth: false })).filter((p) => p.laboratorio?.id === labs[0].id && p.status === 'ATIVO');
    for (let i = 0; i < 2; i++) {
      await api.post(`/reserva/${criadas[0].id}/alocacoes`, { alunoId: alunos[i].id, maquinaId: pcsLab1[i].id }, as(carlos.id));
    }
  } catch { /* módulo de alocação indisponível */ }

  invalidate();
  return { admin, carlos };
}
