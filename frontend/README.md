# SisLab — Front-end

Interface web do SisLab feita em **HTML, CSS e JavaScript puros** (ES Modules, sem frameworks e sem build). O visual segue o [protótipo do Figma](https://marine-skit-93261035.figma.site/).

## Como executar

1. **Suba o backend** (na raiz do projeto):
   ```bash
   ./mvnw spring-boot:run        # API em http://localhost:8080
   ```
2. **Sirva a pasta `frontend/`** com qualquer servidor estático. Abrir o `index.html` direto pelo explorador de arquivos não funciona, porque o navegador bloqueia ES Modules em `file://`.
   ```bash
   cd frontend
   python -m http.server 5500    # ou: npx serve -l 5500 .  |  VS Code "Live Server"
   ```
3. Acesse **http://localhost:5500**.

> O banco H2 fica em memória e começa vazio a cada reinício. Na tela de login, clique em **"Criar dados de demonstração"** para criar usuários, laboratórios, computadores, turmas e reservas de exemplo.
>
> O front depende do login (`/auth/login`) e do Spring Security no backend. Veja a seção [Integração com a API e o Spring Security](#integração-com-a-api-e-o-spring-security).

| Perfil | E-mail | RGM (senha) |
|---|---|---|
| Docente | carlos@instituicao.edu.br | 20240001 |
| Administrador | admin@instituicao.edu.br | 00000001 |
| Discente | joao@aluno.instituicao.edu.br | 20250001 |

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

O front foi feito para um backend protegido por **Spring Security**. Os endpoints ficam em `config.auth` (`js/config.js`).

| Aspecto | Como o front se comporta |
|---|---|
| Login | `POST /auth/login` com `{ email, rgm }` → `{ id, nome, perfil }` |
| Sessão | Todas as requisições usam `credentials: 'include'`, então o cookie `JSESSIONID` é enviado |
| JWT (opcional) | Se o login devolver `token`, `accessToken` ou `jwt`, o front envia `Authorization: Bearer <token>` |
| CSRF | Se existir o cookie `XSRF-TOKEN` (ex.: `csrf.spa()`), ele é reenviado em `X-XSRF-TOKEN` nos POST/PUT/DELETE |
| `idUsuario` | Continua sendo enviado em todas as requisições, como os controllers exigem; o `TurmaController` o compara com `Principal.getName()` |
| 401 | Encerra a sessão local e volta ao login com o aviso "Sua sessão expirou", preservando a rota |
| 403 | Mostra a mensagem do backend (ex.: "Acesso negado!") |
| Logout | `POST /auth/logout` (falhas são ignoradas) e limpeza local |

Requisitos para o `SecurityFilterChain`:

- `http.cors(Customizer.withDefaults())`, para reaproveitar o `CorsConfig` (com credenciais) e liberar o preflight `OPTIONS`.
- Liberar sem autenticação: `POST /auth/login` e `POST /usuario/cadastrar` (usado pela tela de cadastro e pelos dados de demonstração).
- O `Principal.getName()` precisa ser o **id** do usuário, por causa da validação do `TurmaController`.
- Para 401/403 em JSON (sem redirecionar para uma página de login), use um `AuthenticationEntryPoint` que devolva o status, como o `HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)`.

**Dados de demonstração:** o botão só aparece quando a API está em `localhost`. Ele cadastra os usuários e depois **faz login com cada um** (admin cria laboratórios e turmas; docentes criam reservas e alocações), respeitando as permissões.

**Listagem de reservas:** o backend ainda não tem `GET /reserva`. Por isso o front percorre `GET /reserva/{id}` (veja `js/services/reservas.js`): 200 = visível, 403 = de outro docente, 404 = fim. Quando o endpoint existir, basta trocar a função `listar()`.
