// Formatação de datas, horários e textos (pt-BR).
const pad = (n) => String(n).padStart(2, '0');

/** Date -> "AAAA-MM-DD" (data local, sem fuso). */
export function toISODate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "AAAA-MM-DD" -> Date (meia-noite local). */
export function parseISODate(iso) {
  if (!iso) return null;
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "AAAA-MM-DD" + "HH:mm[:ss]" -> Date local. */
export function toDateTime(isoDate, time) {
  const d = parseISODate(isoDate);
  if (!d) return null;
  const [h = 0, mi = 0] = String(time || '0:0').split(':').map(Number);
  d.setHours(h, mi, 0, 0);
  return d;
}

/** "AAAA-MM-DD" -> "DD/MM/AAAA" */
export function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).split('-');
  return `${d}/${m}/${y}`;
}

/** "HH:mm:ss" -> "HH:mm" */
export function fmtTime(t) {
  if (!t) return '—';
  return String(t).slice(0, 5);
}

export const fmtRange = (a, b) => `${fmtTime(a)}–${fmtTime(b)}`;

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const weekdayShort = (d) => WEEKDAYS_SHORT[d.getDay()];
export const monthName = (i) => MONTHS[i];

/** Diferença em dias de calendário entre hoje e a data ISO. */
export function daysFromToday(iso) {
  const d = parseISODate(iso);
  const t = parseISODate(toISODate());
  return Math.round((d - t) / 86_400_000);
}

/** "Hoje", "Amanhã", "Ontem" ou "Quinta, 10/09/2026" */
export function fmtRelativeDay(iso, { withDate = true } = {}) {
  const diff = daysFromToday(iso);
  const date = fmtDate(iso);
  const prefix = diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : diff === -1 ? 'Ontem' : WEEKDAYS[parseISODate(iso).getDay()];
  return withDate ? `${prefix}, ${date}` : prefix;
}

/** Início da semana (segunda-feira) para uma data. */
export function startOfWeek(d) {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (r.getDay() + 6) % 7; // segunda = 0
  r.setDate(r.getDate() - day);
  return r;
}

export function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export const minutesOf = (t) => {
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + (m || 0);
};

/** Comparação natural: "PC 2" < "PC 10". */
const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });
export const naturalCompare = (a, b) => collator.compare(String(a ?? ''), String(b ?? ''));

/** Normaliza texto para busca (sem acentos, minúsculo). */
export const normalize = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export const pad2 = (n) => pad(n);
