// Utilitários de DOM e de templates HTML com escape automático (proteção contra XSS).

class SafeHtml {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"'`]/g, (c) => ESCAPES[c]);
}

/** Marca uma string como HTML confiável (não será escapada). */
export const raw = (value) => new SafeHtml(String(value ?? ''));

function serialize(value) {
  if (value == null || value === false || value === true) return '';
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(serialize).join('');
  return escapeHtml(value);
}

/**
 * Template tag: html`<p>${texto}</p>`
 * Todos os valores interpolados são escapados, exceto SafeHtml (outros html``, raw(), icon()).
 * Arrays são concatenados; null/undefined/booleanos viram string vazia.
 */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += serialize(values[i]) + strings[i + 1];
  return new SafeHtml(out);
}

/** Renderiza conteúdo dentro de um elemento. */
export function render(el, content) {
  el.innerHTML = serialize(content);
  return el;
}

/** Cria um elemento a partir de um template html``. */
export function createEl(content) {
  const t = document.createElement('template');
  t.innerHTML = serialize(content).trim();
  return t.content.firstElementChild;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Delegação de eventos: on(root, 'click', '[data-action=x]', (ev, el) => ...) */
export function on(root, type, selector, handler, options) {
  const listener = (ev) => {
    const target = ev.target.closest(selector);
    if (target && root.contains(target)) handler(ev, target);
  };
  root.addEventListener(type, listener, options);
  return () => root.removeEventListener(type, listener, options);
}

/** Lê os campos de um <form> como objeto (strings aparadas). */
export function formData(form) {
  const data = {};
  for (const [k, v] of new FormData(form).entries()) data[k] = typeof v === 'string' ? v.trim() : v;
  return data;
}

/** Exibe erros de validação por campo (name) dentro de um formulário. */
export function showFieldErrors(form, errors = {}) {
  clearFieldErrors(form);
  let first = null;
  for (const [name, message] of Object.entries(errors)) {
    const input = form.querySelector(`[name="${CSS.escape(name)}"]`);
    const field = input?.closest('.field');
    if (!field) continue;
    field.classList.add('has-error');
    let err = field.querySelector('.field-error');
    if (!err) {
      err = document.createElement('div');
      err.className = 'field-error';
      field.appendChild(err);
    }
    err.textContent = message;
    first ??= input;
  }
  first?.focus();
  return !!first;
}

export function clearFieldErrors(form) {
  form.querySelectorAll('.field.has-error').forEach((f) => f.classList.remove('has-error'));
}

/** Coloca um botão em estado de carregamento durante uma Promise. */
export async function withLoading(button, fn) {
  if (!button) return fn();
  button.classList.add('is-loading');
  button.disabled = true;
  try {
    return await fn();
  } finally {
    button.classList.remove('is-loading');
    button.disabled = false;
  }
}

export function debounce(fn, ms = 200) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
