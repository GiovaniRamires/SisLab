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

## Integração com a API

- O usuário logado é enviado no header `idUsuario`, que é o mecanismo de identificação atual do backend.
- **Login**: usa `POST /auth/login` (PR *feature-login*). Se esse endpoint ainda não existir no servidor, o front valida e-mail + RGM pelas listagens de usuários.
- **Alocação**: usa `GET/POST /reserva/{id}/alocacoes` (PR *feature/alocacao*). Sem o endpoint, o mapa aparece só para consulta e um aviso é exibido.
- **Listagem de reservas**: o backend ainda não tem `GET /reserva`. Por isso o front percorre `GET /reserva/{id}` (veja `js/services/reservas.js`). Quando o endpoint de listagem existir, basta trocar a função `listar()`.
