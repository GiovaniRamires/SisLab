// Fragmentos de UI compartilhados entre telas.
import { html } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { PERFIS, initials } from '../core/session.js';
import { PC_STATUS } from '../services/laboratorios.js';
import { SITUACAO, situacao } from '../services/reservas.js';

export const pageHeader = ({ title, subtitle, actions, back }) => html`
  <div class="page-header">
    <div>
      ${back ? html`<a class="btn btn-back btn-sm" href="#${back.href}" style="margin-left:-4px;margin-bottom:6px">${icon('arrowLeft')} ${back.label}</a>` : ''}
      <h1 class="page-title">${title}</h1>
      ${subtitle ? html`<p class="page-subtitle">${subtitle}</p>` : ''}
    </div>
    ${actions ? html`<div class="row wrap">${actions}</div>` : ''}
  </div>`;

export const statCard = ({ label, value, hint, tone = '' }) => html`
  <div class="card stat">
    <p class="stat-label">${label}</p>
    <p class="stat-value ${tone}">${value}</p>
    ${hint ? html`<p class="stat-hint">${hint}</p>` : ''}
  </div>`;

export const pcBadge = (status) => {
  const s = PC_STATUS[status] || { label: status, badge: 'neutral' };
  return html`<span class="badge badge-${s.badge} dot">${s.label}</span>`;
};

export const reservaBadge = (r) => {
  const s = SITUACAO[situacao(r)];
  return html`<span class="badge badge-${s.badge}">${s.label}</span>`;
};

export const perfilBadge = (perfil) => {
  const tone = { ADMINISTRADOR: 'purple', DOCENTE: 'info', DISCENTE: 'success' }[perfil] || 'neutral';
  return html`<span class="badge badge-${tone}">${PERFIS[perfil]?.label || perfil}</span>`;
};

export const userAvatar = (u, size = 'sm') => html`<span class="avatar ${size} ${PERFIS[u.perfil]?.avatar || ''}">${initials(u.nome)}</span>`;

export const stepper = (steps, current) => html`
  <nav class="stepper" aria-label="Etapas">
    ${steps.map((label, i) => {
      const n = i + 1;
      const state = n < current ? 'done' : n === current ? 'active' : '';
      return html`
        ${i ? html`<span class="step-sep">${icon('chevronRight')}</span>` : ''}
        <span class="step ${state}" ${n === current ? html`aria-current="step"` : ''}>
          <span class="step-num">${n < current ? icon('check') : n}</span>${label}
        </span>`;
    })}
  </nav>`;

export const callout = ({ tone = 'info', iconName, title, text }) => html`
  <div class="callout callout-${tone}">
    ${icon(iconName || { info: 'info', warning: 'alert', danger: 'alertCircle', success: 'checkCircle', neutral: 'info' }[tone])}
    <div><p class="callout-title">${title}</p>${text ? html`<p class="callout-text">${text}</p>` : ''}</div>
  </div>`;

export const skeletonRows = (n = 4) => html`
  <div class="card">${Array.from({ length: n }, () => html`
    <div class="list-row"><div class="grow stack" style="--gap:8px"><div class="skeleton" style="width:45%"></div><div class="skeleton" style="width:28%;min-height:10px"></div></div><div class="skeleton" style="width:80px;height:22px"></div></div>`)}
  </div>`;

export const skeletonStats = (n = 4) => html`
  <div class="grid grid-4">${Array.from({ length: n }, () => html`
    <div class="card stat"><div class="skeleton" style="width:50%;min-height:10px"></div><div class="skeleton mt-12" style="width:40%;height:26px"></div><div class="skeleton mt-8" style="width:30%;min-height:9px"></div></div>`)}
  </div>`;

/** Mapa de computadores do laboratório. getState(pc) -> { cls, sub, clickable, selected, title } */
export function labMap(pcs, getState, { legend = true } = {}) {
  if (!pcs.length) {
    return html`<div class="lab-map"><div class="empty" style="padding:28px 8px"><div class="empty-icon">${icon('monitor')}</div><div class="empty-title">Nenhum computador cadastrado</div><p class="empty-text">Este laboratório ainda não possui computadores.</p></div></div>`;
  }
  return html`
    <div class="lab-map">
      <div class="teacher-desk">Mesa do Professor</div>
      <div class="lab-map-divider"></div>
      <div class="pc-grid">
        ${pcs.map((pc) => {
          const st = getState(pc);
          const tag = st.clickable ? 'button' : 'div';
          return html`<${tag} class="pc ${st.cls || ''} ${st.selected ? 'selected' : ''} ${st.pulse ? 'selectable' : ''}" ${st.clickable ? html`type="button" data-pc="${pc.id}"` : ''} title="${st.title || pc.identificador}">
            <span class="pc-id">${pc.identificador}</span><span class="pc-sub">${st.sub}</span>
          </${tag}>`;
        })}
      </div>
      ${legend ? html`
        <div class="legend">
          <span><i style="background:var(--success)"></i>Disponível</span>
          <span><i style="background:var(--primary)"></i>Alocado</span>
          <span><i style="background:var(--warning)"></i>Manutenção</span>
          <span><i style="background:var(--danger)"></i>Desativado</span>
        </div>` : ''}
    </div>`;
}
