// Cache simples em memória com TTL, para evitar requisições repetidas entre telas.
import { config } from '../config.js';

const store = new Map(); // key -> { at, promise }

export function cached(key, loader, ttl = config.cacheTtl) {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.promise;
  const promise = loader().catch((err) => { store.delete(key); throw err; });
  store.set(key, { at: Date.now(), promise });
  return promise;
}

/** Invalida chaves que começam com algum dos prefixos informados (ou tudo). */
export function invalidate(...prefixes) {
  if (!prefixes.length) return store.clear();
  for (const key of store.keys()) if (prefixes.some((p) => key.startsWith(p))) store.delete(key);
}
