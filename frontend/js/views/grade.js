// Grade de horários semanal das reservas (Docente: próprias | Admin: todas).
import { html, render, on, raw } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { session } from '../core/session.js';
import { errorState } from '../core/ui.js';
import { toISODate, parseISODate, startOfWeek, addDays, weekdayShort, monthName, minutesOf, fmtRange, pad2 } from '../core/format.js';
import { reservas, situacao } from '../services/reservas.js';
import { laboratorios } from '../services/laboratorios.js';
import { invalidate } from '../services/cache.js';
import { pageHeader, skeletonRows } from '../components/common.js';

const START_H = 7;
const END_H = 23;
const HOUR_PX = 52;
const PALETTE = [
  ['#eff6ff', '#1d4ed8', '#bfdbfe'], ['#f0fdf4', '#15803d', '#bbf7d0'], ['#f5f3ff', '#6d28d9', '#ddd6fe'],
  ['#fff7ed', '#c2410c', '#fed7aa'], ['#fdf2f8', '#be185d', '#fbcfe8'], ['#ecfeff', '#0e7490', '#a5f3fc'],
];

const state = { semana: null, lab: '' };

export default async function grade(ctx) {
  const { root } = ctx;
  let lista = [];
  let labs = [];
  state.semana ??= startOfWeek(new Date());

  const header = pageHeader({
    title: 'Grade de horários',
    subtitle: session.isAdmin ? 'Ocupação semanal dos laboratórios.' : 'Suas aulas reservadas na semana.',
    actions: session.isDocente ? html`<a class="btn btn-primary" href="#/reservar">${icon('plus')} Reservar laboratório</a>` : '',
  });

  const corDoLab = (labId) => PALETTE[Math.max(0, labs.findIndex((l) => l.id === labId)) % PALETTE.length];

  function paint() {
    const ini = state.semana;
    const dias = Array.from({ length: 7 }, (_, i) => addDays(ini, i));
    const isos = dias.map(toISODate);
    const daSemana = lista.filter((r) => isos.includes(r.data) && situacao(r) !== 'CANCELADA' && (!state.lab || String(r.laboratorioId) === state.lab));
    const temDomingo = daSemana.some((r) => r.data === isos[6]);
    const visiveis = dias.slice(0, temDomingo ? 7 : 6);
    const fim = dias[6];
    const label = ini.getMonth() === fim.getMonth()
      ? `${ini.getDate()} – ${fim.getDate()} de ${monthName(ini.getMonth())} de ${fim.getFullYear()}`
      : `${ini.getDate()} de ${monthName(ini.getMonth())} – ${fim.getDate()} de ${monthName(fim.getMonth())} de ${fim.getFullYear()}`;
    const hoje = toISODate();
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const hours = Array.from({ length: END_H - START_H }, (_, i) => START_H + i);
    const height = (END_H - START_H) * HOUR_PX;

    render(root, html`
      <div class="page wide">
        ${header}
        <div class="card">
          <div class="row wrap between" style="padding:16px 20px;border-bottom:1px solid var(--border);gap:12px">
            <div class="row" style="gap:6px">
              <button class="btn btn-secondary btn-icon btn-sm" data-week="-1" aria-label="Semana anterior">${icon('chevronLeft')}</button>
              <button class="btn btn-secondary btn-icon btn-sm" data-week="1" aria-label="Próxima semana">${icon('chevronRight')}</button>
              <button class="btn btn-secondary btn-sm" data-week="0">Hoje</button>
              <h2 class="fw-600" style="font-size:14px;margin-left:8px">${label}</h2>
            </div>
            <div class="row" style="gap:8px">
              <span class="text-xs subtle">${daSemana.length} reserva(s)</span>
              <select class="select input-sm" style="width:auto;min-width:190px" data-lab aria-label="Filtrar laboratório">
                <option value="">Todos os laboratórios</option>
                ${labs.map((l) => html`<option value="${l.id}" ${String(l.id) === state.lab ? 'selected' : ''}>${l.nome}</option>`)}
              </select>
              <button class="btn btn-ghost btn-icon btn-sm" data-action="reload" title="Atualizar">${icon('refresh')}</button>
            </div>
          </div>
          <div class="cal-wrap">
            <div class="cal" style="--cols:${visiveis.length};--hour:${HOUR_PX}px">
              <div class="cal-head">
                <div></div>
                ${visiveis.map((d) => {
                  const iso = toISODate(d);
                  return html`<div class="cal-day ${iso === hoje ? 'today' : ''}"><span>${weekdayShort(d)}</span><strong>${pad2(d.getDate())}</strong></div>`;
                })}
              </div>
              <div class="cal-body" style="height:${height}px">
                <div class="cal-hours">${hours.map((h) => html`<div style="height:${HOUR_PX}px"><span>${pad2(h)}:00</span></div>`)}</div>
                ${visiveis.map((d) => {
                  const iso = toISODate(d);
                  const doDia = daSemana.filter((r) => r.data === iso);
                  return html`
                    <div class="cal-col ${iso === hoje ? 'today' : ''} ${iso < hoje ? 'past' : ''}">
                      ${hours.map(() => html`<div class="cal-slot" style="height:${HOUR_PX}px"></div>`)}
                      ${iso === hoje && nowMin >= START_H * 60 && nowMin <= END_H * 60 ? html`<div class="cal-now" style="top:${((nowMin - START_H * 60) / 60) * HOUR_PX}px"></div>` : ''}
                      ${layout(doDia).map(({ r, col, cols }) => {
                        const top = Math.max(0, ((minutesOf(r.horaInicio) - START_H * 60) / 60) * HOUR_PX);
                        const h = Math.max(22, ((minutesOf(r.horaFim) - minutesOf(r.horaInicio)) / 60) * HOUR_PX - 3);
                        const [bg, fg, bd] = corDoLab(r.laboratorioId);
                        const enc = situacao(r) === 'ENCERRADA';
                        return html`
                          <a class="cal-event ${enc ? 'done' : ''}" href="#/reservas/${r.id}" title="${r.disciplina} — ${r.laboratorioNome} (${fmtRange(r.horaInicio, r.horaFim)})"
                             style="${raw(`top:${top}px;height:${h}px;left:calc(${(col / cols) * 100}% + 3px);width:calc(${100 / cols}% - 6px);background:${bg};color:${fg};border-color:${bd}`)}">
                            <strong>${r.disciplina}</strong>
                            <span>${fmtRange(r.horaInicio, r.horaFim)}</span>
                            <span>${r.laboratorioNome}${session.isAdmin ? ` · ${r.docenteNome}` : ''}</span>
                          </a>`;
                      })}
                    </div>`;
                })}
              </div>
            </div>
          </div>
          ${labs.length ? html`<div class="legend" style="margin:0;padding:14px 20px">${labs.map((l) => html`<span><i style="background:${corDoLab(l.id)[1]}"></i>${l.nome}</span>`)}</div>` : ''}
        </div>
      </div>`);
  }

  /** Distribui reservas sobrepostas lado a lado. */
  function layout(items) {
    const sorted = items.slice().sort((a, b) => minutesOf(a.horaInicio) - minutesOf(b.horaInicio));
    const out = [];
    let group = [];
    let groupEnd = -1;
    const flush = () => {
      const colsEnd = [];
      const placed = group.map((r) => {
        let c = colsEnd.findIndex((end) => end <= minutesOf(r.horaInicio));
        if (c === -1) { c = colsEnd.length; colsEnd.push(0); }
        colsEnd[c] = minutesOf(r.horaFim);
        return { r, col: c };
      });
      placed.forEach((p) => out.push({ ...p, cols: colsEnd.length }));
      group = [];
    };
    for (const r of sorted) {
      if (group.length && minutesOf(r.horaInicio) >= groupEnd) flush();
      group.push(r);
      groupEnd = Math.max(groupEnd, minutesOf(r.horaFim));
    }
    if (group.length) flush();
    return out;
  }

  async function load(force = false) {
    if (force) invalidate('reservas', 'labs');
    render(root, html`<div class="page wide">${header}${skeletonRows(6)}</div>`);
    try {
      [lista, labs] = await Promise.all([reservas.listar(), laboratorios.listar()]);
      // Abre na semana da próxima reserva se a semana atual estiver vazia
      if (!ctx.query.get('semana') && state.autoJumped !== true) {
        state.autoJumped = true;
        const isos = Array.from({ length: 7 }, (_, i) => toISODate(addDays(state.semana, i)));
        const prox = lista.find((r) => r.data >= toISODate() && situacao(r) !== 'CANCELADA');
        if (prox && !lista.some((r) => isos.includes(r.data))) state.semana = startOfWeek(parseISODate(prox.data));
      }
      if (ctx.isCurrent()) paint();
    } catch (err) {
      render(root, html`<div class="page wide">${header}<div class="card">${errorState(err)}</div></div>`);
    }
  }

  on(root, 'click', '[data-week]', (e, el) => {
    const n = Number(el.dataset.week);
    state.semana = n === 0 ? startOfWeek(new Date()) : addDays(state.semana, n * 7);
    paint();
  });
  on(root, 'change', '[data-lab]', (e, el) => { state.lab = el.value; paint(); });
  on(root, 'click', '[data-action=reload]', () => load(true));
  on(root, 'click', '[data-action=retry]', () => load(true));

  await load();
}
