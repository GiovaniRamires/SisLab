// Tela de login (fiel ao protótipo) + detecção de servidor/banco vazio.
import { html, render, on, $, formData, showFieldErrors, clearFieldErrors, withLoading } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { navigate } from '../core/router.js';
import { toast, showError, formModal } from '../core/ui.js';
import { config } from '../config.js';
import { ping } from '../core/api.js';
import { auth } from '../services/auth.js';
import { usuarios } from '../services/usuarios.js';
import { seedDemo, DEMO_USERS } from '../services/seed.js';
import { invalidate } from '../services/cache.js';
import { callout } from '../components/common.js';

export default function login({ root }) {
  render(root, html`
    <div class="auth">
      <div class="auth-box">
        <a class="auth-brand" href="#/" style="text-decoration:none"><span class="brand-logo">S</span><span class="brand-name">SisLab</span></a>
        <h1>Entrar no SisLab</h1>
        <p class="auth-sub">Use suas credenciais institucionais para acessar o sistema.</p>

        <div data-status class="mt-24"></div>

        <form class="auth-card form" novalidate data-form style="margin-top:16px">
          <div class="field">
            <label class="label" for="email">E-mail institucional</label>
            <input class="input" id="email" name="email" type="email" autocomplete="username" placeholder="carlos@instituicao.edu.br" required autofocus>
            <div class="field-error"></div>
          </div>
          <div class="field">
            <label class="label" for="rgm">RGM</label>
            <div class="input-addon">
              <input class="input" id="rgm" name="rgm" type="password" autocomplete="current-password" placeholder="••••••••" required>
              <button type="button" data-action="toggle-pass" aria-label="Mostrar RGM">${icon('eye')}</button>
            </div>
            <div class="field-error"></div>
          </div>
          <div class="row between">
            <label class="check"><input type="checkbox" name="remember" checked> Lembrar de mim</label>
            <button type="button" class="btn-link btn" data-action="forgot" style="font-size:13px">Esqueci meu acesso</button>
          </div>
          <button class="btn btn-primary btn-block" style="height:43px;font-size:14px" type="submit">Entrar</button>
          <p class="center text-sm muted">Não tem conta? <a href="#/cadastro" class="fw-500">Cadastre-se</a></p>
        </form>

        <div class="auth-foot">
          <span>${icon('lock')} Acesso seguro para Docentes, Discentes e Administradores</span>
          <a class="btn-link btn" href="#/">← Voltar à página inicial</a>
          <button class="btn-link btn" data-action="server" title="Alterar servidor da API">${icon('server')} Servidor: <span data-server>${config.apiUrl}</span></button>
        </div>
      </div>
    </div>`);

  const form = $('[data-form]', root);
  const statusEl = $('[data-status]', root);

  async function checkServer() {
    render(statusEl, '');
    const p = await ping();
    if (!p.ok) {
      render(statusEl, html`
        ${callout({ tone: 'danger', iconName: 'wifiOff', title: 'Servidor da API indisponível', text: html`Não foi possível conectar em <code>${config.apiUrl}</code>. Inicie o backend (<code>./mvnw spring-boot:run</code>) ou altere o endereço do servidor.` })}
        <div class="row end mt-8"><button class="btn btn-secondary btn-sm" data-action="retry">${icon('refresh')} Tentar novamente</button></div>`);
      return;
    }
    try {
      invalidate('usuarios:');
      const todos = await usuarios.listarTodos();
      if (!todos.length) {
        render(statusEl, html`
          <div class="callout callout-info">
            ${icon('database')}
            <div class="grow">
              <p class="callout-title">Nenhum usuário cadastrado</p>
              <p class="callout-text">O banco de dados está vazio (H2 em memória). Crie dados de demonstração para explorar o sistema ou cadastre o primeiro usuário.</p>
              <div class="row wrap mt-12">
                <button class="btn btn-primary btn-sm" data-action="seed">${icon('sparkles')} Criar dados de demonstração</button>
                <a class="btn btn-secondary btn-sm" href="#/cadastro">Criar conta</a>
              </div>
            </div>
          </div>`);
      }
    } catch { /* ignora */ }
  }

  function showDemoCredentials() {
    const row = (u, label) => html`
      <button class="list-row clickable" style="width:100%;padding:10px 12px;border:0;border-bottom:1px solid var(--border);text-align:left" data-fill="${u.email}|${u.rgm}">
        <span><span class="list-title" style="display:block">${label}</span><span class="list-meta mono" style="display:block">${u.email} · RGM ${u.rgm}</span></span>
        ${icon('arrowRight')}
      </button>`;
    render(statusEl, html`
      <div class="callout callout-success">
        ${icon('checkCircle')}
        <div class="grow">
          <p class="callout-title">Dados de demonstração criados!</p>
          <p class="callout-text">Clique em um usuário para preencher o login:</p>
          <div class="card mt-8" style="overflow:hidden">
            ${row(DEMO_USERS.docente, 'Docente — Carlos Andrade')}
            ${row(DEMO_USERS.admin, 'Administrador')}
            ${row(DEMO_USERS.discente, 'Discente — João Pereira')}
          </div>
        </div>
      </div>`);
  }

  on(root, 'click', '[data-action=retry]', checkServer);
  on(root, 'click', '[data-fill]', (e, el) => {
    const [email, rgm] = el.dataset.fill.split('|');
    form.email.value = email;
    form.rgm.value = rgm;
    form.querySelector('button[type=submit]').focus();
  });
  on(root, 'click', '[data-action=seed]', async (e, btn) => {
    await withLoading(btn, async () => {
      try {
        await seedDemo((msg) => { btn.title = msg; });
        showDemoCredentials();
        toast.success('Usuários, laboratórios, computadores, turmas e reservas foram criados.', { title: 'Demonstração pronta' });
      } catch (err) {
        showError(err, 'Falha ao criar dados de demonstração');
      }
    });
  });
  on(root, 'click', '[data-action=toggle-pass]', (e, btn) => {
    const input = form.rgm;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    render(btn, icon(show ? 'eyeOff' : 'eye'));
    btn.setAttribute('aria-label', show ? 'Ocultar RGM' : 'Mostrar RGM');
  });
  on(root, 'click', '[data-action=forgot]', () => {
    toast.info('O acesso usa seu e-mail institucional e seu RGM. Em caso de dúvida, procure a administração do laboratório.', { title: 'Recuperar acesso', duration: 7000 });
  });
  on(root, 'click', '[data-action=server]', async () => {
    const r = await formModal({
      title: 'Servidor da API',
      description: 'Endereço onde o backend Spring Boot do SisLab está em execução.',
      iconName: 'server',
      fields: html`
        <div class="field">
          <label class="label" for="apiUrl">URL base</label>
          <input class="input mono" id="apiUrl" name="apiUrl" value="${config.apiUrl}" placeholder="${config.defaultApiUrl}" required>
          <p class="hint">Padrão: ${config.defaultApiUrl}</p>
        </div>`,
      onSubmit: async ({ apiUrl }) => {
        const p = await ping(apiUrl);
        if (!p.ok) toast.warning(`Não foi possível conectar em ${apiUrl}. O endereço foi salvo mesmo assim.`);
        config.apiUrl = apiUrl;
        return true;
      },
    });
    if (r) {
      $('[data-server]', root).textContent = config.apiUrl;
      checkServer();
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    const { email, rgm } = formData(form);
    const errors = {};
    if (!email) errors.email = 'Informe seu e-mail.';
    else if (!form.email.checkValidity()) errors.email = 'Informe um e-mail válido.';
    if (!rgm) errors.rgm = 'Informe seu RGM.';
    if (showFieldErrors(form, errors)) return;

    await withLoading(form.querySelector('button[type=submit]'), async () => {
      try {
        const user = await auth.login(email, rgm, form.remember.checked);
        toast.success(`Bem-vindo(a), ${user.nome.split(' ')[0]}!`, { title: 'Login realizado' });
        const redirect = sessionStorage.getItem('sislab.redirect');
        sessionStorage.removeItem('sislab.redirect');
        navigate(redirect && redirect !== '/login' ? redirect : '/app');
      } catch (err) {
        if (err.status === 401) showFieldErrors(form, { rgm: err.message });
        showError(err, 'Não foi possível entrar');
      }
    });
  });

  checkServer();
}
