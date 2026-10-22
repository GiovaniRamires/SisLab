# SisLab — Front-end

Interface web do SisLab feita em **HTML, CSS e JavaScript puros** (ES Modules, sem frameworks e sem build). O visual segue o [protótipo do Figma](https://marine-skit-93261035.figma.site/).

## Como executar

1. **Tenha um MySQL em execução** (veja o `README.md` da raiz) e **suba o backend** na raiz do projeto:
   ```bash
   ./mvnw spring-boot:run
   ```
   Isso inicia a **API em http://localhost:8080** e também serve esta pasta `frontend/` em **http://localhost:5500**. Não é preciso subir um servidor à parte.
2. Acesse **http://localhost:5500**.

> As portas ficam em `src/main/resources/application.properties` (`server.port` e `sislab.frontend.porta`); o CORS acompanha a porta do front. Abrir o `index.html` direto pelo explorador de arquivos não funciona, porque o navegador bloqueia ES Modules em `file://`.

> Com o banco MySQL vazio, na tela de login clique em **"Criar dados de demonstração"** para criar usuários, laboratórios, computadores, turmas e reservas de exemplo. Os dados ficam salvos no MySQL entre reinícios.
>
> O front depende do login (`/auth/login`) e do Spring Security + JWT no backend. Veja a seção [Integração com a API e o Spring Security](#integração-com-a-api-e-o-spring-security).

Usuários de demonstração (todos com a senha `sislab123`; o administrador é criado pelo backend na inicialização):

| Perfil | E-mail | Senha |
|---|---|---|
| Docente | carlos@instituicao.edu.br | sislab123 |
| Administrador | admin@instituicao.edu.br | sislab123 |
| Discente | joao@aluno.instituicao.edu.br | sislab123 |

Se a API estiver em outro endereço, altere em **Configurações** (ou pelo link "Servidor" na tela de login).

## Funcionalidades por perfil

| Tela | Administrador | Docente | Discente |
|---|:-:|:-:|:-:|
| Landing, login e cadastro | ✓ | ✓ | ✓ |
| Dashboard (específico de cada perfil) | ✓ | ✓ | ✓ |
| Laboratórios: consulta e mapa de computadores | ✓ | ✓ | ✓ |
| Laboratórios: cadastro, edição, exclusão e cadastro de PCs em lote | ✓ | | |
| Computadores: inventário, filtros e status individual ou em massa | ✓ | | |
| Usuários: CRUD por perfil | ✓ | | |
| Turmas: criação | ✓ | | |
| Turmas: matrícula de alunos em lote | ✓ | ✓ (próprias) | |
| Reservar laboratório (assistente em 3 etapas) | | ✓ | |
| Reservas: lista e detalhe | ✓ (todas) | ✓ (próprias) | |
| Alocação de alunos nas estações (automática ou manual) | consulta | ✓ | |
| Grade de horários semanal | ✓ | ✓ | |
| Perfil, configurações e notificações | ✓ | ✓ | ✓ |

## Estrutura

```
frontend/
├── index.html            # shell da SPA
├── css/                  # tokens (cores do Figma), base, componentes, layout, páginas
└── js/
    ├── main.js           # rotas e layout
    ├── config.js         # URL da API
    ├── core/             # router (hash), cliente HTTP, sessão, templates com escape (XSS), UI (toast/modal)
    ├── services/         # um módulo por recurso da API + cache em memória
    ├── components/       # shell (sidebar/topbar), notificações, componentes comuns
    └── views/            # uma tela por arquivo
```

## Integração com a API e o Spring Security

O backend usa **Spring Security com JWT** (stateless) e senhas com **BCrypt**. Os endpoints ficam em `config.auth` (`js/config.js`).

| Aspecto | Como o front se comporta |
|---|---|
| Login | `POST /auth/login` com `{ email, senha }` → `{ token, id, nome, email, rgm, perfil }` |
| Token | Guardado na sessão local e enviado em `Authorization: Bearer <token>` em todas as requisições autenticadas |
| Identificação | O usuário é identificado **pelo token** (subject = id). O header `idUsuario` não é mais enviado nem aceito |
| Cadastro | `POST /usuario/cadastrar` é público para DISCENTE e DOCENTE; criar ADMINISTRADOR exige um administrador autenticado |
| Senha | Mínimo de 8 e máximo de 72 caracteres (limite do BCrypt). Na edição de usuário/perfil, em branco mantém a senha atual |
| 401 | Token expirado ou inválido: encerra a sessão local e volta ao login com o aviso "Sua sessão expirou", preservando a rota |
| 403 | Mostra a mensagem do backend (ex.: "Acesso negado!") |
| Logout | `POST /auth/logout` (falhas são ignoradas) e descarte do token. Como o JWT é stateless, ele continua válido até expirar (60 min por padrão) |
| CORS/CSRF | CORS configurado no `CorsConfig`; CSRF desativado (não há cookies de sessão) |

Permissões por rota (as regras finas por perfil/dono continuam nos *services*):

- Público: `POST /auth/login`, `POST /auth/logout`, `POST /usuario/cadastrar` (sem ADMINISTRADOR).
- `GET /usuario/**`: ADMINISTRADOR e DOCENTE. `PUT /usuario/{id}`: o próprio usuário (sem trocar o perfil) ou ADMINISTRADOR. `DELETE /usuario/{id}`: ADMINISTRADOR.
- Demais rotas: qualquer usuário autenticado.

**Dados de demonstração:** o botão só aparece quando a API está em `localhost`. Ele cadastra docentes e discentes e depois **faz login com o administrador criado pelo backend e com cada docente** (admin cria laboratórios e turmas; docentes criam reservas e alocações), respeitando as permissões.

**Listagem de reservas:** o backend ainda não tem `GET /reserva`. Por isso o front percorre `GET /reserva/{id}` (veja `js/services/reservas.js`): 200 = visível, 403 = de outro docente, 404 = fim. Quando o endpoint existir, basta trocar a função `listar()`.
