// Cliente HTTP da API REST do SisLab, protegida por Spring Security + JWT.
// - Envia "Authorization: Bearer <token>" (o token vem do login)
// - O usuário logado é identificado pelo próprio token; o backend não aceita mais o header "idUsuario"
// - 401 em requisição autenticada => token expirado/inválido (tratado globalmente via onUnauthorized)
// - Normaliza erros em ApiError (status, mensagem amigável, erros por campo)
import { config } from '../config.js';
import { session } from './session.js';

export class ApiError extends Error {
  constructor({ status, message, fieldErrors = null, body = null, path = '' }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.body = body;
    this.path = path;
  }
  get isNetwork() { return this.status === 0; }
  get isUnauthorized() { return this.status === 401; }
  get isForbidden() { return this.status === 403; }
  get isNotFound() { return this.status === 404; }
  get isConflict() { return this.status === 409; }
}

const STATUS_MESSAGES = {
  0: 'Não foi possível conectar ao servidor. Verifique se o backend está em execução.',
  400: 'Os dados enviados são inválidos.',
  401: 'Sua sessão expirou. Entre novamente.',
  403: 'Você não tem permissão para realizar esta ação.',
  404: 'Recurso não encontrado.',
  405: 'Operação não suportada pelo servidor.',
  409: 'Conflito: o registro já existe ou viola uma regra do sistema.',
  500: 'Erro interno no servidor. Tente novamente em instantes.',
};

/** Traduz mensagens padrão de validação do Bean Validation (quando vierem em inglês). */
function translate(msg) {
  if (!msg) return msg;
  const map = {
    'must not be blank': 'Campo obrigatório.',
    'must not be null': 'Campo obrigatório.',
    'must be a well-formed email address': 'Informe um e-mail válido.',
  };
  if (map[msg]) return map[msg];
  const size = /^size must be between (\d+) and (\d+)$/.exec(msg);
  if (size) return `Deve ter no máximo ${size[2]} caracteres.`;
  return msg;
}

async function parseBody(res) {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

function readCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name.replace(/[-.]/g, '\\$&') + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

/* ---------- Sessão expirada (401) ---------- */
let unauthorizedHandler = null;
let unauthorizedFired = false;
/** Registra o tratamento global de 401 (ex.: encerrar sessão e ir para o login). */
export function onUnauthorized(fn) { unauthorizedHandler = fn; }
session.subscribe((u) => { if (u) unauthorizedFired = false; });

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * opts.auth (padrão true): envia o token do usuário logado (Bearer) e
 * trata 401 como sessão expirada. Use auth:false em endpoints públicos (login, cadastro).
 */
export async function request(method, path, { body, headers = {}, auth = true, signal } = {}) {
  const url = config.apiUrl + path;
  const h = { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', ...headers };
  if (body !== undefined) h['Content-Type'] = 'application/json';

  const user = session.user;
  if (auth && user?.token) h.Authorization ??= `Bearer ${user.token}`;
  if (MUTATING.has(method)) {
    const csrf = readCookie(config.auth.csrfCookie);
    if (csrf) h[config.auth.csrfHeader] = csrf;
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: h,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'include',
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError({ status: 0, message: STATUS_MESSAGES[0], path });
  }

  const data = await parseBody(res);
  if (res.ok) return data;

  // Formatos de erro do backend:
  //  - GlobalExceptionHandler: { status, erros: {campo: msg} } | { status, mensagem }
  //  - ResponseStatusException / Spring Security: { status, error, message, path }
  let message = '';
  let fieldErrors = null;
  if (data && typeof data === 'object') {
    if (data.erros && typeof data.erros === 'object') {
      fieldErrors = Object.fromEntries(Object.entries(data.erros).map(([k, v]) => [k, translate(v)]));
      message = 'Verifique os campos destacados.';
    }
    message ||= data.mensagem || data.message || data.detail || '';
  } else if (typeof data === 'string' && data.length < 300 && !data.trim().startsWith('<')) {
    message = data;
  }
  if (!message || message === 'No message available' || /^(Unauthorized|Forbidden)$/i.test(message)) {
    message = STATUS_MESSAGES[res.status] || `Erro ${res.status}.`;
  }

  const error = new ApiError({ status: res.status, message, fieldErrors, body: data, path });

  if (res.status === 401 && auth && user && !unauthorizedFired) {
    unauthorizedFired = true;
    unauthorizedHandler?.(error);
  }
  throw error;
}

export const api = {
  get: (path, opts) => request('GET', path, opts),
  post: (path, body, opts) => request('POST', path, { ...opts, body }),
  put: (path, body, opts) => request('PUT', path, { ...opts, body }),
  del: (path, opts) => request('DELETE', path, opts),
};

/**
 * Testa se o backend responde. Qualquer resposta HTTP (inclusive 401/403 do Spring Security)
 * indica servidor no ar; apenas falha de rede ou 5xx contam como indisponível.
 */
export async function ping(baseUrl = config.apiUrl) {
  const start = performance.now();
  try {
    const res = await fetch(baseUrl.replace(/\/+$/, '') + '/laboratorio', { headers: { Accept: 'application/json' }, credentials: 'include' });
    return { ok: res.status < 500, status: res.status, ms: Math.round(performance.now() - start) };
  } catch {
    return { ok: false, status: 0, ms: Math.round(performance.now() - start) };
  }
}
