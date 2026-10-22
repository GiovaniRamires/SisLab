// Componentes de interface imperativos: toasts, modais, confirmação e formulários em modal.
import { html, createEl, render, formData, showFieldErrors, clearFieldErrors, withLoading } from './dom.js';
import { icon } from './icons.js';
import { ApiError } from './api.js';

/* ===================== Toasts ===================== */
let toastRoot;
const TOAST_ICONS = { success: 'checkCircle', error: 'alertCircle', warning: 'alert', info: 'info' };

export function toast(message, { type = 'info', title, duration = 4500 } = {}) {
  toastRoot ??= document.body.appendChild(createEl(html`<div class="toasts" role="region" aria-live="polite" aria-label="Notificações"></div>`));
  const defaults = { success: 'Tudo certo', error: 'Algo deu errado', warning: 'Atenção', info: 'Informação' };
  const el = createEl(html`
    <div class="toast ${type}" role="${type === 'error' ? 'alert' : 'status'}">
      ${icon(TOAST_ICONS[type])}
      <div class="grow">
        <div class="toast-title">${title || defaults[type]}</div>
        ${message ? html`<div class="toast-text">${message}</div>` : ''}
      </div>
      <button class="toast-close" aria-label="Fechar">${icon('x')}</button>
    </div>`);
  const close = () => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 200);
  };
  el.querySelector('.toast-close').addEventListener('click', close);
  toastRoot.appendChild(el);
  if (duration) setTimeout(close, duration);
  return close;
}

toast.success = (m, o) => toast(m, { ...o, type: 'success' });
toast.error = (m, o) => toast(m, { ...o, type: 'error' });
toast.warning = (m, o) => toast(m, { ...o, type: 'warning' });
toast.info = (m, o) => toast(m, { ...o, type: 'info' });

/** Exibe um erro (ApiError ou genérico) como toast. */
export function showError(err, title) {
  if (err instanceof ApiError) console.warn(`[API ${err.status}] ${err.path}: ${err.message}`);
  else console.error(err);
  const msg = err instanceof ApiError ? err.message : (err?.message || 'Erro inesperado.');
  toast.error(msg, { title });
}

/* ===================== Modal ===================== */
/**
 * Abre um modal. Retorna { el, close, body }.
 * content: html`` do corpo; footer: html`` opcional.
 */
export function openModal({ title, description, content, footer, size = '', iconName, iconTone = 'info', onClose, dismissible = true } = {}) {
  const dlg = createEl(html`
    <dialog class="modal ${size}" aria-labelledby="modal-title">
      <div class="modal-header">
        <div class="row start gap-12">
          ${iconName ? html`<div class="modal-icon ${iconTone}">${icon(iconName)}</div>` : ''}
          <div>
            <h2 class="modal-title" id="modal-title">${title}</h2>
            ${description ? html`<p class="modal-desc">${description}</p>` : ''}
          </div>
        </div>
        ${dismissible ? html`<button class="icon-btn" data-close aria-label="Fechar">${icon('x')}</button>` : ''}
      </div>
      <div class="modal-body"></div>
      ${footer ? html`<div class="modal-footer">${footer}</div>` : ''}
    </dialog>`);
  const body = dlg.querySelector('.modal-body');
  if (content) render(body, content);
  else body.remove();

  let closed = false;
  const close = (result) => {
    if (closed) return;
    closed = true;
    dlg.close();
    dlg.remove();
    onClose?.(result);
  };
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); if (dismissible) close(); });
  dlg.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) close();
    else if (e.target === dlg && dismissible) close(); // clique no backdrop
  });
  document.body.appendChild(dlg);
  dlg.showModal();
  dlg.querySelector('[autofocus]')?.focus();
  return { el: dlg, body, close };
}

/** Diálogo de confirmação. Resolve true/false. */
export function confirmDialog({ title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false, iconName } = {}) {
  return new Promise((resolve) => {
    const m = openModal({
      title,
      description: message,
      iconName: iconName || (danger ? 'alert' : 'info'),
      iconTone: danger ? 'danger' : 'info',
      footer: html`
        <button class="btn btn-secondary" data-close>${cancelLabel}</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok autofocus>${confirmLabel}</button>`,
      onClose: (r) => resolve(r === true),
    });
    m.el.querySelector('[data-ok]').addEventListener('click', () => m.close(true));
  });
}

/**
 * Modal com formulário. onSubmit(data, form) pode lançar ApiError
 * (erros de campo são exibidos automaticamente). Retornar algo != false fecha o modal.
 */
export function formModal({ title, description, fields, submitLabel = 'Salvar', size = '', iconName, onSubmit, onMount }) {
  return new Promise((resolve) => {
    const formId = 'f' + Math.random().toString(36).slice(2, 8);
    const m = openModal({
      title, description, size, iconName,
      content: html`<form class="form" id="${formId}" novalidate>${fields}</form>`,
      footer: html`
        <button type="button" class="btn btn-secondary" data-close>Cancelar</button>
        <button type="submit" class="btn btn-primary" form="${formId}">${submitLabel}</button>`,
      onClose: (r) => resolve(r ?? null),
    });
    const form = m.el.querySelector('form');
    const submitBtn = m.el.querySelector('button[type=submit]');
    onMount?.(form, m);
    form.querySelector('input:not([type=hidden]):not([readonly]), select, textarea')?.focus();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFieldErrors(form);
      const data = formData(form);
      // validação nativa dos campos "required"
      const missing = {};
      form.querySelectorAll('[required]').forEach((el) => { if (!String(el.value).trim()) missing[el.name] = 'Campo obrigatório.'; });
      form.querySelectorAll('input[type=email]').forEach((el) => { if (el.value && !el.checkValidity()) missing[el.name] = 'Informe um e-mail válido.'; });
      if (Object.keys(missing).length) { showFieldErrors(form, missing); return; }
      try {
        const result = await withLoading(submitBtn, () => onSubmit(data, form));
        if (result !== false) m.close(result ?? true);
      } catch (err) {
        if (err instanceof ApiError && err.fieldErrors) {
          showFieldErrors(form, err.fieldErrors);
        }
        showError(err);
      }
    });
  });
}

/* ===================== Blocos reutilizáveis ===================== */
export const loadingBlock = (text = 'Carregando...') => html`
  <div class="loading-block"><div class="spinner"></div><span>${text}</span></div>`;

export const emptyState = ({ iconName = 'info', title, text, action } = {}) => html`
  <div class="empty">
    <div class="empty-icon">${icon(iconName)}</div>
    <div class="empty-title">${title}</div>
    ${text ? html`<p class="empty-text">${text}</p>` : ''}
    ${action || ''}
  </div>`;

export const errorState = (err, retryAction = 'retry') => html`
  <div class="empty">
    <div class="empty-icon" style="background:var(--danger-bg);color:var(--danger-strong)">${icon(err?.status === 0 ? 'wifiOff' : 'alertCircle')}</div>
    <div class="empty-title">${err?.status === 0 ? 'Servidor indisponível' : 'Não foi possível carregar'}</div>
    <p class="empty-text">${err?.message || 'Erro inesperado.'}</p>
    <button class="btn btn-secondary" data-action="${retryAction}">${icon('refresh')} Tentar novamente</button>
  </div>`;
