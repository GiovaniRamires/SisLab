// Meu perfil: dados do usuário logado e edição (PUT /usuario/{id}).
import { html, render, $, formData, showFieldErrors, clearFieldErrors, withLoading } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { session, PERFIS, initials } from '../core/session.js';
import { toast, showError } from '../core/ui.js';
import { usuarios } from '../services/usuarios.js';
import { pageHeader, perfilBadge, callout } from '../components/common.js';
import { userFields, validateUser, explainConflict } from './cadastro.js';

export default function perfil({ root }) {
  const u = session.user;
  const p = PERFIS[u.perfil];
  const permissoes = {
    ADMINISTRADOR: ['Cadastrar e editar laboratórios e computadores', 'Gerenciar usuários e turmas', 'Consultar todas as reservas'],
    DOCENTE: ['Reservar laboratórios para suas turmas', 'Alocar alunos nas estações', 'Matricular alunos nas suas turmas'],
    DISCENTE: ['Consultar laboratórios', 'Ver a disponibilidade dos computadores'],
  }[u.perfil];

  render(root, html`
    <div class="page medium">
      ${pageHeader({ title: 'Meu perfil', subtitle: 'Seus dados de acesso ao SisLab.' })}
      <div class="card card-pad">
        <div class="row" style="gap:18px">
          <span class="avatar lg ${p.avatar}">${initials(u.nome)}</span>
          <div class="grow">
            <h2 class="fw-700" style="font-size:18px" data-nome>${u.nome}</h2>
            <p class="text-sm muted mt-4">${u.email}</p>
            <div class="row mt-8">${perfilBadge(u.perfil)}<span class="badge badge-neutral mono">ID ${u.id}</span></div>
          </div>
        </div>
        <hr class="divider">
        <p class="label">Você pode</p>
        <ul class="stack mt-8" style="--gap:6px">${permissoes.map((x) => html`<li class="text-sm row" style="color:var(--text-2)"><span style="color:var(--success)">${icon('check')}</span>${x}</li>`)}</ul>
      </div>

      <form class="card mt-20" novalidate data-form>
        <div class="card-header"><div><h2 class="card-title">Editar dados</h2><p class="card-subtitle">O perfil de acesso só pode ser alterado por um administrador.</p></div></div>
        <div class="card-body form">
          ${userFields(u, { withPerfil: false, senha: 'optional' })}
          ${callout({ tone: 'warning', title: 'Atenção ao alterar e-mail ou senha', text: 'O e-mail e a senha são suas credenciais de login. Use os novos valores no próximo acesso.' })}
        </div>
        <div class="card-footer row end"><button class="btn btn-primary" type="submit">${icon('check')} Salvar alterações</button></div>
      </form>
    </div>`);

  const form = $('[data-form]', root);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    const data = formData(form);
    if (showFieldErrors(form, validateUser(data, form))) return;
    await withLoading(form.querySelector('button[type=submit]'), async () => {
      try {
        const r = await usuarios.atualizar(u.id, { ...data, perfil: u.perfil });
        session.update({ nome: r.nome, email: r.email, rgm: r.rgm });
        $('[data-nome]', root).textContent = r.nome;
        toast.success('Seus dados foram atualizados.', { title: 'Perfil salvo' });
      } catch (err) {
        if (err.status === 409 && showFieldErrors(form, await explainConflict(data, u.id))) return toast.error('E-mail ou RGM já cadastrado.');
        if (err.fieldErrors) showFieldErrors(form, err.fieldErrors);
        showError(err, 'Não foi possível salvar');
      }
    });
  });
}
