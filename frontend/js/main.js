// Ponto de entrada: registra as rotas e controla o layout de cada tela.
import { route, setNotFound, onAfterNavigate, startRouter, navigate, currentPath } from './core/router.js';
import { render } from './core/dom.js';
import { onUnauthorized } from './core/api.js';
import { auth } from './services/auth.js';
import { ensureShell, destroyShell } from './components/shell.js';

import landing from './views/landing.js';
import login from './views/login.js';
import cadastro from './views/cadastro.js';
import dashboard from './views/dashboard.js';
import reservar from './views/reservar.js';
import reservasList from './views/reservas.js';
import reservaDetalhe from './views/reserva-detalhe.js';
import grade from './views/grade.js';
import { turmasList, turmaDetalhe } from './views/turmas.js';
import { laboratoriosList, laboratorioDetalhe } from './views/laboratorios.js';
import computadoresView from './views/computadores.js';
import usuariosView from './views/usuarios.js';
import perfil from './views/perfil.js';
import configuracoes from './views/configuracoes.js';
import notFound from './views/notfound.js';

const ADM = 'ADMINISTRADOR';
const DOC = 'DOCENTE';
const DIS = 'DISCENTE';

route('/', { view: landing, layout: 'public', title: 'Início' });
route('/login', { view: login, layout: 'public', guestOnly: true, title: 'Entrar' });
route('/cadastro', { view: cadastro, layout: 'public', guestOnly: true, title: 'Criar conta' });

route('/app', { view: dashboard, auth: true, title: 'Dashboard' });
route('/reservar', { view: reservar, auth: true, roles: [DOC], title: 'Reservar laboratório' });
route('/reservas', { view: reservasList, auth: true, roles: [DOC, ADM], title: 'Reservas' });
route('/reservas/:id', { view: reservaDetalhe, auth: true, roles: [DOC, ADM], title: 'Reserva' });
route('/grade', { view: grade, auth: true, roles: [DOC, ADM], title: 'Grade de horários' });
route('/turmas', { view: turmasList, auth: true, roles: [DOC, ADM], title: 'Turmas' });
route('/turmas/:id', { view: turmaDetalhe, auth: true, roles: [DOC, ADM], title: 'Turma' });
route('/laboratorios', { view: laboratoriosList, auth: true, roles: [ADM, DOC, DIS], title: 'Laboratórios' });
route('/laboratorios/:id', { view: laboratorioDetalhe, auth: true, roles: [ADM, DOC, DIS], title: 'Laboratório' });
route('/computadores', { view: computadoresView, auth: true, roles: [ADM], title: 'Computadores' });
route('/usuarios', { view: usuariosView, auth: true, roles: [ADM], title: 'Usuários' });
route('/perfil', { view: perfil, auth: true, title: 'Meu perfil' });
route('/configuracoes', { view: configuracoes, auth: true, title: 'Configurações' });
setNotFound(notFound);

const appRoot = document.getElementById('app');

// Spring Security respondeu 401 a uma requisição autenticada: a sessão no servidor expirou
// (ou o servidor reiniciou). Encerra a sessão local e volta ao login, preservando a rota atual.
onUnauthorized(() => {
  const path = currentPath();
  if (path !== '/login') sessionStorage.setItem('sislab.redirect', path);
  sessionStorage.setItem('sislab.expired', String(Date.now()));
  auth.expire();
  destroyShell();
  navigate('/login', { replace: true });
});

// Monta o layout adequado e entrega à view um container novo (ctx.root) a cada navegação.
onAfterNavigate((r, ctx) => {
  const view = document.createElement('div');
  view.className = 'view';
  const useShell = r.auth || r.layout === 'app';
  if (useShell) {
    const content = ensureShell(appRoot);
    render(content, '');
    content.appendChild(view);
  } else {
    destroyShell();
    render(appRoot, '');
    appRoot.appendChild(view);
  }
  ctx.root = view;
  window.scrollTo(0, 0);
});

startRouter();
