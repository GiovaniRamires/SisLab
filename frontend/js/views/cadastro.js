// Cadastro público de usuário (POST /usuario/cadastrar).
import { html, render, $, formData, showFieldErrors, clearFieldErrors, withLoading } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { navigate } from '../core/router.js';
import { toast, showError } from '../core/ui.js';
import { usuarios } from '../services/usuarios.js';
import { auth } from '../services/auth.js';

export function userFields(u = {}, { withPerfil = true, perfilEditable = true } = {}) {
  const perfil = u.perfil || 'DISCENTE';
  const opt = (value, label, ic) => html`
    <div class="role-option">
      <input type="radio" name="perfil" id="perfil-${value}" value="${value}" ${perfil === value ? 'checked' : ''} ${perfilEditable ? '' : 'disabled'}>
      <label for="perfil-${value}">${icon(ic)}${label}</label>
    </div>`;
  return html`
    <div class="field">
      <label class="label" for="nome">Nome completo<span class="req">*</span></label>
      <input class="input" id="nome" name="nome" value="${u.nome || ''}" placeholder="Ex.: Maria Souza" required maxlength="120" autocomplete="name">
      <div class="field-error"></div>
    </div>
    <div class="form-grid">
      <div class="field">
        <label class="label" for="email">E-mail institucional<span class="req">*</span></label>
        <input class="input" id="email" name="email" type="email" value="${u.email || ''}" placeholder="nome@instituicao.edu.br" required autocomplete="email">
        <div class="field-error"></div>
      </div>
      <div class="field">
        <label class="label" for="rgm">RGM<span class="req">*</span></label>
        <input class="input mono" id="rgm" name="rgm" value="${u.rgm || ''}" placeholder="20250001" required inputmode="numeric" maxlength="20">
        <div class="field-error"></div>
      </div>
    </div>
    ${withPerfil ? html`
      <div class="field">
        <span class="label">Perfil de acesso<span class="req">*</span></span>
        <div class="role-picker">
          ${opt('DISCENTE', 'Discente', 'book')}
          ${opt('DOCENTE', 'Docente', 'graduation')}
          ${opt('ADMINISTRADOR', 'Administrador', 'shield')}
        </div>
        <div class="field-error"></div>
      </div>` : ''}`;
}

export function validateUser(data, form) {
  const errors = {};
  if (!data.nome) errors.nome = 'Informe o nome.';
  if (!data.email) errors.email = 'Informe o e-mail.';
  else if (!form.email.checkValidity()) errors.email = 'Informe um e-mail válido.';
  if (!data.rgm) errors.rgm = 'Informe o RGM.';
  return errors;
}

/** Converte o 409 genérico do backend em mensagens por campo. */
export async function explainConflict(data, idAtual) {
  const todos = await usuarios.listarTodos().catch(() => []);
  const errors = {};
  if (todos.some((u) => u.email?.toLowerCase() === data.email.toLowerCase() && u.id !== idAtual)) errors.email = 'Este e-mail já está cadastrado.';
  if (todos.some((u) => String(u.rgm) === data.rgm && u.id !== idAtual)) errors.rgm = 'Este RGM já está cadastrado.';
  return errors;
}

export default function cadastro({ root }) {
  render(root, html`
    <div class="auth">
      <div class="auth-box wide">
        <a class="auth-brand" href="#/" style="text-decoration:none"><span class="brand-logo">S</span><span class="brand-name">SisLab</span></a>
        <h1>Criar conta</h1>
        <p class="auth-sub">Cadastre-se para acessar o sistema. Você usará seu e-mail e RGM para entrar.</p>
        <form class="auth-card form" novalidate data-form>
          ${userFields()}
          <button class="btn btn-primary btn-block" style="height:43px;font-size:14px" type="submit">Criar conta e entrar</button>
          <p class="center text-sm muted">Já possui conta? <a href="#/login" class="fw-500">Entrar</a></p>
        </form>
        <div class="auth-foot"><a class="btn-link btn" href="#/">← Voltar à página inicial</a></div>
      </div>
    </div>`);

  const form = $('[data-form]', root);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    const data = formData(form);
    if (showFieldErrors(form, validateUser(data, form))) return;

    await withLoading(form.querySelector('button[type=submit]'), async () => {
      try {
        await usuarios.cadastrar(data);
        await auth.login(data.email, data.rgm, true);
        toast.success('Sua conta foi criada com sucesso.', { title: 'Bem-vindo(a) ao SisLab!' });
        navigate('/app');
      } catch (err) {
        if (err.status === 409) {
          const errs = await explainConflict(data);
          if (showFieldErrors(form, errs)) return toast.error('E-mail ou RGM já cadastrado.');
        }
        if (err.fieldErrors) showFieldErrors(form, err.fieldErrors);
        showError(err, 'Não foi possível criar a conta');
      }
    });
  });
}
