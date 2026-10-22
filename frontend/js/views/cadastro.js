// Cadastro público de usuário (POST /usuario/cadastrar).
import { html, render, $, formData, showFieldErrors, clearFieldErrors, withLoading } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { navigate } from '../core/router.js';
import { toast, showError } from '../core/ui.js';
import { usuarios } from '../services/usuarios.js';
import { auth } from '../services/auth.js';

/** senha: null (sem campo) | 'required' (cadastro) | 'optional' (edição: em branco mantém a atual). */
export function userFields(u = {}, { withPerfil = true, perfilEditable = true, allowAdmin = true, senha = null } = {}) {
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
    ${senha ? html`
      <div class="form-grid">
        <div class="field">
          <label class="label" for="senha">${senha === 'required' ? 'Senha' : 'Nova senha'}${senha === 'required' ? html`<span class="req">*</span>` : ''}</label>
          <input class="input" id="senha" name="senha" type="password" autocomplete="new-password" maxlength="72" placeholder="${senha === 'required' ? 'Mínimo de 8 caracteres' : 'Deixe em branco para manter'}" ${senha === 'required' ? 'required' : ''}>
          <div class="field-error"></div>
        </div>
        <div class="field">
          <label class="label" for="confirmarSenha">Confirmar senha</label>
          <input class="input" id="confirmarSenha" name="confirmarSenha" type="password" autocomplete="new-password" maxlength="72">
          <div class="field-error"></div>
        </div>
      </div>` : ''}
    ${withPerfil ? html`
      <div class="field">
        <span class="label">Perfil de acesso<span class="req">*</span></span>
        <div class="role-picker">
          ${opt('DISCENTE', 'Discente', 'book')}
          ${opt('DOCENTE', 'Docente', 'graduation')}
          ${allowAdmin ? opt('ADMINISTRADOR', 'Administrador', 'shield') : ''}
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
  const campoSenha = form.elements.senha;
  if (campoSenha) {
    if (!data.senha) {
      if (campoSenha.required) errors.senha = 'Informe a senha.';
    } else if (data.senha.length < 8) errors.senha = 'A senha deve ter no mínimo 8 caracteres.';
    else if (data.senha.length > 72) errors.senha = 'A senha deve ter no máximo 72 caracteres.';
    else if (data.senha !== data.confirmarSenha) errors.confirmarSenha = 'As senhas não conferem.';
  }
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
        <p class="auth-sub">Cadastre-se para acessar o sistema. Você usará seu e-mail e a senha escolhida para entrar.</p>
        <form class="auth-card form" novalidate data-form>
          ${userFields({}, { allowAdmin: false, senha: 'required' })}
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
        await auth.login(data.email, data.senha, true);
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
