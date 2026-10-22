// Página inicial pública (fiel ao protótipo do Figma).
import { html, render, on } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { session } from '../core/session.js';

export default function landing({ root }) {
  const logged = session.isAuthenticated;
  render(root, html`
    <div class="landing">
      <header class="public-header">
        <a class="brand" href="#/"><span class="brand-logo">S</span><span class="brand-name">SisLab</span></a>
        <nav class="public-nav" aria-label="Seções">
          <a href="#/" data-scroll="top">Início</a>
          <a href="#/" data-scroll="recursos">Recursos</a>
          <a href="#/" data-scroll="sobre">Sobre</a>
        </nav>
        <a class="btn btn-primary" href="#${logged ? '/app' : '/login'}">${logged ? 'Ir para o painel' : 'Entrar'}</a>
      </header>

      <section class="hero" id="top">
        <span class="eyebrow">Sistema Acadêmico Institucional</span>
        <h1>SisLab</h1>
        <p class="lead">Sistema de Reserva e Gestão de Laboratórios Acadêmicos</p>
        <p class="sublead">Reserve laboratórios, consulte a disponibilidade e organize os computadores dos seus alunos antes da aula.</p>
        <div class="hero-actions">
          <a class="btn btn-primary btn-lg" href="#${logged ? '/app' : '/login'}">${logged ? 'Acessar o SisLab' : 'Entrar no SisLab'}</a>
          <button class="btn btn-secondary btn-lg" data-scroll="recursos">Conheça o sistema</button>
        </div>
      </section>

      <section class="features" id="recursos">
        <p class="features-title">Principais funcionalidades</p>
        <div class="features-grid">
          <article class="feature">
            <div class="feature-icon">${icon('calendarCheck')}</div>
            <h3>Reservas sem conflitos</h3>
            <p>Visualize a disponibilidade e evite sobreposição de horários entre turmas — o sistema bloqueia reservas conflitantes.</p>
          </article>
          <article class="feature">
            <div class="feature-icon">${icon('users')}</div>
            <h3>Alocação de alunos</h3>
            <p>Distribua os alunos nas estações automaticamente ou defina manualmente cada posição no mapa do laboratório.</p>
          </article>
          <article class="feature">
            <div class="feature-icon">${icon('monitor')}</div>
            <h3>Gestão em tempo real</h3>
            <p>Acompanhe o status dos laboratórios, máquinas e reservas em um único painel centralizado.</p>
          </article>
        </div>
      </section>

      <section class="about" id="sobre">
        <div>
          <span class="eyebrow">Sobre o SisLab</span>
          <h2 class="mt-16">Um sistema para toda a comunidade acadêmica</h2>
          <p>O SisLab centraliza a reserva de laboratórios de informática, o controle dos computadores e a organização das turmas, com permissões específicas para cada perfil de acesso.</p>
        </div>
        <div class="about-roles">
          <div class="role-card"><span class="feature-icon" style="margin:0;width:38px;height:38px;font-size:18px;background:var(--purple-bg);color:var(--purple)">${icon('shield')}</span><div><h4>Administradores</h4><p class="muted">Cadastram laboratórios, computadores, usuários e turmas.</p></div></div>
          <div class="role-card"><span class="feature-icon" style="margin:0;width:38px;height:38px;font-size:18px">${icon('graduation')}</span><div><h4>Docentes</h4><p class="muted">Reservam laboratórios e organizam os alunos nas estações.</p></div></div>
          <div class="role-card"><span class="feature-icon" style="margin:0;width:38px;height:38px;font-size:18px;background:var(--success-bg);color:var(--success)">${icon('book')}</span><div><h4>Discentes</h4><p class="muted">Consultam laboratórios e a disponibilidade das máquinas.</p></div></div>
        </div>
      </section>

      <footer class="public-footer">© ${new Date().getFullYear()} SisLab — Sistema Acadêmico de Gestão de Laboratórios</footer>
    </div>`);

  on(root, 'click', '[data-scroll]', (e, el) => {
    e.preventDefault();
    const target = document.getElementById(el.dataset.scroll);
    if (el.dataset.scroll === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
    else target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
