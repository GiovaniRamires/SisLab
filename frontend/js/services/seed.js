// Popula o backend (H2 em memória) com dados de demonstração — ferramenta de desenvolvimento.
// Cada etapa é feita autenticando-se de verdade (POST /auth/login) com o usuário responsável,
// respeitando as regras do Spring Security: ADM cria laboratórios/turmas, docentes criam reservas.
import { api, ApiError } from '../core/api.js';
import { auth } from './auth.js';
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

export class DemoJaExiste extends Error {}

const slug = (nome) => nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.');

/** Executa promessas em lotes para não sobrecarregar o servidor. fn(item, indiceGlobal) */
async function inBatches(items, size, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...await Promise.all(items.slice(i, i + size).map((item, j) => fn(item, i + j))));
  }
  return out;
}

const entrarComo = (u) => auth.login(u.email, u.rgm, false);

export async function seedDemo(onProgress = () => {}) {
  const cadastrar = (u) => api.post('/usuario/cadastrar', u, { auth: false });

  onProgress('Criando usuários...');
  try {
    await cadastrar(DEMO_USERS.admin);
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) throw new DemoJaExiste('Os dados de demonstração já existem neste servidor.');
    throw err;
  }
  const carlos = await cadastrar(DEMO_USERS.docente);
  await cadastrar(DEMO_USERS.docente2);
  const alunos = await inBatches(ALUNOS, 5, (nome, i) => cadastrar({
    nome,
    email: i === 0 ? DEMO_USERS.discente.email : `${slug(nome)}@aluno.instituicao.edu.br`,
    rgm: String(20250001 + i),
    perfil: 'DISCENTE',
  }));

  try {
    // ---------- Administrador: laboratórios, computadores, turmas e matrículas ----------
    await entrarComo(DEMO_USERS.admin);
    onProgress('Criando laboratórios e computadores...');
    const labs = [];
    for (const def of LABS) {
      const lab = await api.post('/laboratorio', { nome: def.nome, bloco: def.bloco });
      labs.push(lab);
      const nums = Array.from({ length: def.pcs }, (_, i) => i + 1);
      await inBatches(nums, 10, (n) => api.post('/computador', {
        identificador: `PC ${String(n).padStart(2, '0')}`,
        status: def.manutencao.includes(n) ? 'EM_MANUTENCAO' : def.desativado.includes(n) ? 'DESATIVADO' : 'ATIVO',
        laboratorioId: lab.id,
      }));
    }

    onProgress('Criando turmas e matrículas...');
    const docentes = await api.get('/usuario/listaDocente');
    const ana = docentes.find((d) => d.email === DEMO_USERS.docente2.email);
    const t1 = await api.post('/turma', { nome: 'ADS — 3º Semestre', disciplina: 'Programação Orientada a Objetos', docenteId: carlos.id });
    const t2 = await api.post('/turma', { nome: 'ADS — 1º Semestre', disciplina: 'Algoritmos e Estruturas de Dados', docenteId: carlos.id });
    const t3 = await api.post('/turma', { nome: 'SI — 2º Semestre', disciplina: 'Banco de Dados', docenteId: ana.id });
    // Matrículas em sequência: evita atualizações concorrentes da mesma turma
    const matricular = (t, list) => inBatches(list, 1, (a) => api.post(`/turma/${t.id}/alunos`, { alunoId: a.id }));
    await matricular(t1, alunos.slice(0, 12));
    await matricular(t2, alunos.slice(6, 14));
    await matricular(t3, alunos.slice(0, 8));

    // ---------- Docentes: reservas e alocações ----------
    onProgress('Criando reservas de exemplo...');
    const hoje = new Date();
    const reservar = (lab, turma, dia, ini, fim, justificativa) => api.post('/reserva', {
      laboratorioId: lab.id, turmaId: turma.id, data: toISODate(addDays(hoje, dia)), horaInicio: ini, horaFim: fim, justificativa,
    });

    await entrarComo(DEMO_USERS.docente);
    const r1 = await reservar(labs[0], t1, 1, '19:00', '21:00', 'Aula prática de herança e polimorfismo');
    await reservar(labs[2], t2, 3, '17:00', '19:00', 'Lista de exercícios de vetores');
    await reservar(labs[0], t1, 8, '19:00', '21:00', 'Projeto em grupo');
    const ativosLab1 = (await api.get('/computador')).filter((p) => p.laboratorio?.id === labs[0].id && p.status === 'ATIVO');
    for (let i = 0; i < 2; i++) {
      await api.post(`/reserva/${r1.id}/alocacoes`, { alunoId: alunos[i].id, maquinaId: ativosLab1[i].id });
    }

    await entrarComo(DEMO_USERS.docente2);
    await reservar(labs[1], t3, 1, '19:00', '21:00', 'Modelagem relacional');
  } finally {
    await auth.logout();
    invalidate();
  }
}
