// Cliente HTTP da API REST do SisLab.
// - Prefixa a URL base configurada
// - Envia automaticamente o header "idUsuario" do usuário logado
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
  get isNotFound() { return this.status === 404; }
  get isForbidden() { return this.status === 403; }
  get isConflict() { return this.status === 409; }
}

const STATUS_MESSAGES = {
  0: 'Não foi possível conectar ao servidor. Verifique se o backend está em execução.',
  400: 'Os dados enviados são inválidos.',
  401: 'Sua sessão não é válida. Entre novamente.',
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

export async function request(method, path, { body, headers = {}, auth = true, signal } = {}) {
  const url = config.apiUrl + path;
  const h = { Accept: 'application/json', ...headers };
  if (body !== undefined) h['Content-Type'] = 'application/json';
  const user = session.user;
  if (auth && user) h.idUsuario = String(user.id);

  let res;
  try {
    res = await fetch(url, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined, signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError({ status: 0, message: STATUS_MESSAGES[0], path });
  }

  const data = await parseBody(res);
  if (res.ok) return data;

  // Formatos de erro do backend:
  //  - GlobalExceptionHandler: { status, erros: {campo: msg} } | { status, mensagem }
  //  - ResponseStatusException (Spring Boot): { status, error, message, path }
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
  if (!message || message === 'No message available') message = STATUS_MESSAGES[res.status] || `Erro ${res.status}.`;

  throw new ApiError({ status: res.status, message, fieldErrors, body: data, path });
}

export const api = {
  get: (path, opts) => request('GET', path, opts),
  post: (path, body, opts) => request('POST', path, { ...opts, body }),
  put: (path, body, opts) => request('PUT', path, { ...opts, body }),
  del: (path, opts) => request('DELETE', path, opts),
};

/** Testa a conexão com o backend (usa um endpoint público). */
export async function ping(baseUrl = config.apiUrl) {
  const start = performance.now();
  try {
    const res = await fetch(baseUrl.replace(/\/+$/, '') + '/laboratorio', { headers: { Accept: 'application/json' } });
    return { ok: res.ok, status: res.status, ms: Math.round(performance.now() - start) };
  } catch {
    return { ok: false, status: 0, ms: Math.round(performance.now() - start) };
  }
}
