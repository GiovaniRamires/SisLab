// Configurações: servidor da API, cache local e informações do sistema.
import { html, render, on, $, withLoading } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { config } from '../config.js';
import { ping } from '../core/api.js';
import { toast } from '../core/ui.js';
import { invalidate } from '../services/cache.js';
import { pageHeader } from '../components/common.js';

export default function configuracoes({ root }) {
  render(root, html`
    <div class="page medium">
      ${pageHeader({ title: 'Configurações', subtitle: 'Preferências deste navegador.' })}

      <form class="card" data-form novalidate>
        <div class="card-header"><div><h2 class="card-title">Servidor da API</h2><p class="card-subtitle">Endereço do backend Spring Boot do SisLab.</p></div><span data-status></span></div>
        <div class="card-body form">
          <div class="field">
            <label class="label" for="apiUrl">URL base</label>
            <div class="row"><input class="input mono grow" id="apiUrl" name="apiUrl" value="${config.apiUrl}" placeholder="${config.defaultApiUrl}"><button type="button" class="btn btn-secondary" data-action="test" style="height:42px">${icon('link')} Testar</button></div>
            <p class="hint">Padrão: <span class="mono">${config.defaultApiUrl}</span>. A alteração vale apenas para este navegador.</p>
          </div>
        </div>
        <div class="card-footer row between">
          <button type="button" class="btn btn-ghost" data-action="reset">Restaurar padrão</button>
          <button type="submit" class="btn btn-primary">${icon('check')} Salvar</button>
        </div>
      </form>

      <div class="card mt-20">
        <div class="card-header"><div><h2 class="card-title">Dados em cache</h2><p class="card-subtitle">Listas são mantidas em memória por ${config.cacheTtl / 1000}s para deixar a navegação mais rápida.</p></div>
          <button class="btn btn-secondary" data-action="clear">${icon('refresh')} Limpar cache</button></div>
      </div>

      <div class="card mt-20">
        <div class="card-header"><h2 class="card-title">Sobre</h2></div>
        <div class="card-body kv-grid">
          <div><p class="kv-label">Aplicação</p><p class="kv-value">SisLab — Front-end</p></div>
          <div><p class="kv-label">Tecnologia</p><p class="kv-value">HTML, CSS e JavaScript (ES Modules)</p></div>
          <div><p class="kv-label">Documentação da API</p><p class="kv-value"><a href="${config.apiUrl}/swagger-ui/index.html" target="_blank" rel="noopener">Swagger UI ${icon('external')}</a></p></div>
          <div><p class="kv-label">Console do banco</p><p class="kv-value"><a href="${config.apiUrl}/h2-console" target="_blank" rel="noopener">H2 Console ${icon('external')}</a></p></div>
        </div>
      </div>
    </div>`);

  const form = $('[data-form]', root);
  const status = $('[data-status]', root);
  const test = async (url) => {
    const p = await ping(url);
    render(status, p.ok ? html`<span class="badge badge-success dot">Conectado · ${p.ms} ms</span>` : html`<span class="badge badge-danger dot">Sem conexão</span>`);
    return p.ok;
  };

  on(root, 'click', '[data-action=test]', (e, btn) => withLoading(btn, () => test(form.apiUrl.value.trim() || config.defaultApiUrl)));
  on(root, 'click', '[data-action=reset]', () => { form.apiUrl.value = config.defaultApiUrl; });
  on(root, 'click', '[data-action=clear]', () => { invalidate(); toast.success('Os dados serão recarregados do servidor.', { title: 'Cache limpo' }); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await withLoading(form.querySelector('button[type=submit]'), async () => {
      const url = form.apiUrl.value.trim() || config.defaultApiUrl;
      const ok = await test(url);
      config.apiUrl = url;
      invalidate();
      if (ok) toast.success(`Usando ${config.apiUrl}.`, { title: 'Servidor salvo' });
      else toast.warning(`Endereço salvo, mas ${url} não respondeu.`, { title: 'Servidor salvo' });
    });
  });
  test();
}
