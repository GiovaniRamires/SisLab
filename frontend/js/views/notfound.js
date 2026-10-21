// Página 404.
import { html, render } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { session } from '../core/session.js';

export default function notFound({ root }) {
  const home = session.isAuthenticated ? '/app' : '/';
  const box = html`
    <div class="empty" style="padding:96px 24px">
      <div class="empty-icon">${icon('mapPin')}</div>
      <p class="mono subtle" style="font-size:12px;letter-spacing:.1em">ERRO 404</p>
      <div class="empty-title" style="font-size:18px;margin-top:6px">Página não encontrada</div>
      <p class="empty-text">O endereço acessado não existe ou foi movido.</p>
      <a class="btn btn-primary" href="#${home}">${icon('home')} Voltar ao início</a>
    </div>`;
  render(root, session.isAuthenticated ? html`<div class="page">${box}</div>` : html`<div class="auth">${box}</div>`);
}
