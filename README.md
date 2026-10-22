# SisLab

Sistema de reserva de laboratórios (projeto acadêmico). Backend em Spring Boot (Spring Security + JWT, BCrypt, MySQL) e frontend em HTML/CSS/JS puros.

```bash
./mvnw spring-boot:run
```

Um comando sobe os dois:

| Parte | Porta |
|---|---|
| Backend (API) | **8080** |
| Frontend | **5500** (servido pelo próprio backend a partir da pasta `frontend/`) |

Acesse **http://localhost:5500**. Rode o comando na raiz do projeto, para o backend encontrar a pasta `frontend/`.

## Pré-requisito: MySQL

Precisa de um MySQL em `localhost:3306`. Ajuste usuário e senha em `src/main/resources/application.properties`
(padrão: `root` / `root`); o banco `sislab` é criado sozinho. Sem MySQL instalado, use `docker compose up -d`.

## Login

- Administrador criado na primeira execução: `admin@instituicao.edu.br` / `sislab123`.
- `POST /auth/login` com `{ "email", "senha" }` devolve o token JWT e os dados do usuário; as demais rotas exigem `Authorization: Bearer <token>`.
- Senhas são guardadas com BCrypt. O cadastro público cria só DISCENTE e DOCENTE; ADMINISTRADOR só é criado por um administrador.

## Testes

`./mvnw test` usa H2 em memória e não precisa do MySQL.
