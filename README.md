# Save State API

Backend da Save State — biblioteca de jogos com listas, filtros e dashboard. Express + TypeScript + MongoDB (Mongoose), autenticação via JWT em cookie HTTP-only.

## Requisitos

- Node.js 20+
- MongoDB (local ou remoto)

## Setup

```bash
cp .env.example .env   # ajuste JWT_SECRET e MONGODB_URI
npm install
npm run dev            # desenvolvimento (tsx watch)
npm run build && npm start  # produção
npm test               # testes (usa MongoDB em memória)
```

Porta padrão: **1337** (configurável via variável `PORT` no `.env`).

Todas as rotas (exceto auth) exigem sessão: faça login primeiro; o JWT é salvo em cookie `token` (HTTP-only) automaticamente.

---

# Rotas

## Health

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| GET | `/api/health` | Health check | Não |

### GET /api/health

```bash
curl http://localhost:1337/api/health
```

Resposta `200`:

```json
{ "status": "ok" }
```

## Auth (`/api/auth`)

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Cria conta | Não |
| POST | `/api/auth/login` | Autentica (seta cookie) | Não |
| GET | `/api/auth/me` | Usuário autenticado | Sim |
| PATCH | `/api/auth/me` | Atualiza nome | Sim |
| POST | `/api/auth/change-password` | Altera senha autenticado | Sim |
| POST | `/api/auth/forgot-password` | Solicita reset de senha | Não |
| POST | `/api/auth/reset-password` | Reseta senha com token | Não |
| POST | `/api/logout` | Limpa cookie de sessão | Não |
| GET | `/api/auth/export` | Exporta dados (JSON) | Sim |
| GET | `/api/auth/export/csv` | Exporta dados (CSV) | Sim |

### POST /api/auth/register

```bash
curl -c cookies.txt -X POST http://localhost:1337/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Seu Nome", "email": "voce@exemplo.com", "password": "minhasenha123"}'
```

```js
await fetch("http://localhost:1337/api/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ name: "Seu Nome", email: "voce@exemplo.com", password: "minhasenha123" }),
});
```

Body: `{ "name": string, "email": string, "password": string (8–128 chars) }`

Resposta `201`:

```json
{ "data": { "id": "...", "name": "Seu Nome", "email": "voce@exemplo.com" } }
```

### POST /api/auth/login

```bash
curl -c cookies.txt -X POST http://localhost:1337/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "voce@exemplo.com", "password": "minhasenha123"}'
```

```js
await fetch("http://localhost:1337/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ email: "voce@exemplo.com", password: "minhasenha123" }),
});
```

Body: `{ "email": string, "password": string }`

Resposta `200`: Seta cookie HTTP-only `token`. Retorna `{ "data": { "id", "name", "email" } }`.

### GET /api/auth/me

```bash
curl -b cookies.txt http://localhost:1337/api/auth/me
```

```js
await fetch("http://localhost:1337/api/auth/me", {
  credentials: "include",
});
```

Resposta `200`: `{ "data": { "id", "name", "email" } }`

### PATCH /api/auth/me

Atualiza o nome do usuário autenticado.

```bash
curl -b cookies.txt -X PATCH http://localhost:1337/api/auth/me \
  -H "Content-Type: application/json" \
  -d '{"name": "Novo Nome"}'
```

```js
await fetch("http://localhost:1337/api/auth/me", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ name: "Novo Nome" }),
});
```

Body: `{ "name": string (1–100 chars) }`

Resposta `200`: `{ "data": { "id", "name", "email" } }`

### POST /api/auth/change-password

Altera a senha do usuário autenticado. Invalida todas as sessões anteriores (session versioning).

```bash
curl -b cookies.txt -X POST http://localhost:1337/api/auth/change-password \
  -H "Content-Type: application/json" \
  -d '{"currentPassword": "minhasenha123", "newPassword": "novasenha456"}'
```

```js
await fetch("http://localhost:1337/api/auth/change-password", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ currentPassword: "minhasenha123", newPassword: "novasenha456" }),
});
```

Body: `{ "currentPassword": string, "newPassword": string (8–128 chars) }`. `newPassword` deve ser diferente de `currentPassword`.

Resposta `200`: `{ "data": { "message": "Password changed successfully" } }`

### POST /api/auth/forgot-password

Envia email com token de reset (se a conta existir).

```bash
curl -X POST http://localhost:1337/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "voce@exemplo.com"}'
```

```js
await fetch("http://localhost:1337/api/auth/forgot-password", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "voce@exemplo.com" }),
});
```

Body: `{ "email": string }`

Resposta `200`: `{ "data": { "message": "If an account exists, a reset email has been sent" } }`

### POST /api/auth/reset-password

Reseta a senha usando o token recebido por email.

```bash
curl -X POST http://localhost:1337/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token": "token-recebido", "password": "novasenha456"}'
```

```js
await fetch("http://localhost:1337/api/auth/reset-password", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ token: "token-recebido", password: "novasenha456" }),
});
```

Body: `{ "token": string, "password": string (8–128 chars) }`

Resposta `200`: `{ "data": { "message": "Password has been reset" } }`

### POST /api/logout

```bash
curl -b cookies.txt -X POST http://localhost:1337/api/logout
```

```js
await fetch("http://localhost:1337/api/logout", {
  method: "POST",
  credentials: "include",
});
```

Resposta `200`: `{ "data": { "message": "Logged out" } }`

### GET /api/auth/export

Exporta todos os dados do usuário em JSON. Retorna arquivo para download.

```bash
curl -b cookies.txt http://localhost:1337/api/auth/export -o export.json
```

```js
const res = await fetch("http://localhost:1337/api/auth/export", {
  credentials: "include",
});
const blob = await res.blob();
```

Resposta `200`: JSON com `user`, `games`, `lists`, `exportedAt`. Headers: `Content-Disposition: attachment; filename="save-state-export.json"`.

### GET /api/auth/export/csv

Exporta todos os dados do usuário em CSV. Retorna arquivo para download.

```bash
curl -b cookies.txt http://localhost:1337/api/auth/export/csv -o export.csv
```

```js
const res = await fetch("http://localhost:1337/api/auth/export/csv", {
  credentials: "include",
});
const blob = await res.blob();
```

Resposta `200`: CSV com dados do usuário, jogos e listas. Headers: `Content-Disposition: attachment; filename="save-state-export.csv"`, `Content-Type: text/csv; charset=utf-8`.

## Games (`/api/games`) — todas exigem auth

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/games` | Lista paginada do usuário, com filtros |
| POST | `/api/games` | Adiciona jogo à biblioteca |
| GET | `/api/games/stats` | Estatísticas (mesmos filtros) |
| GET | `/api/games/:gameId` | Um jogo |
| PATCH | `/api/games/:gameId` | Atualiza dados pessoais (+ metadata se manual) |
| PUT | `/api/games/:gameId` | Atualiza dados pessoais (+ metadata se manual) |
| DELETE | `/api/games/:gameId` | Remove o jogo da biblioteca (mantém GlobalGame) |
| POST | `/api/games/:gameId/lists/:listId` | Adiciona etiqueta de lista (idempotente) |
| DELETE | `/api/games/:gameId/lists/:listId` | Remove etiqueta de lista |

### POST /api/games — metadata manual

```bash
curl -b cookies.txt -X POST http://localhost:1337/api/games \
  -H "Content-Type: application/json" \
  -d '{
    "game": {
      "name": "The Legend of Zelda: Ocarina of Time",
      "genres": ["Action-Adventure"],
      "platforms": ["N64"],
      "developers": ["Nintendo EAD"],
      "publishers": ["Nintendo"],
      "releaseDate": "1998-11-21"
    },
    "status": "finished",
    "hoursPlayed": 32.5,
    "timesFinished": 2,
    "rating": 9.5,
    "review": "Um clássico."
  }'
```

```js
await fetch("http://localhost:1337/api/games", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    game: { name: "Ocarina of Time", platforms: ["N64"], releaseDate: "1998-11-21" },
    status: "finished",
    hoursPlayed: 32.5,
    rating: 9.5,
  }),
});
```

Body:

- `gameId`: string (ObjectId) — ID de um `GlobalGame` existente (alternativa a `game`)
- `game`: object — metadata manual (alternativa a `gameId`). Campos:
  - `name` (obrigatório, 1–255 chars)
  - `cover` (string, max 2048)
  - `genres` (array de strings, max 50)
  - `platforms` (array de strings, max 50)
  - `developers` (array de strings, max 50)
  - `publishers` (array de strings, max 50)
  - `summary` (string, max 20000)
  - `releaseDate` (date)
- `status`: `backlog` | `playing` | `replaying` | `stalled` | `dropped` | `limbo` | `endless` | `achievement` | `finished` | `wishlist` (default: `backlog`)
- `hoursPlayed`: number (0–100000)
- `timesFinished`: integer (0–10000)
- `rating`: number (0–10)
- `review`: string (max 20000)

Passe `gameId` para vincular a um GlobalGame existente, ou `game` para criar um novo.

Resposta `201`: `{ "data": { ...UserGame com game populated } }`

### GET /api/games — filtros e paginação

Query params:

| Param | Tipo | Default | Descrição |
|---|---|---|---|
| `page` | int ≥ 1 | 1 | Página |
| `limit` | int 1–100 | 20 | Itens por página |
| `search` | string | — | Busca por nome |
| `listId` | ObjectId | — | Filtra por lista |
| `genre` | string | — | Filtra por gênero |
| `platform` | string | — | Filtra por plataforma |
| `developer` | string | — | Filtra por desenvolvedor |
| `publisher` | string | — | Filtra por publicadora |
| `releaseDateFrom` | date | — | Data de lançamento mínima |
| `releaseDateTo` | date | — | Data de lançamento máxima |
| `hoursPlayedMin` | number 0–100000 | — | Horas jogadas mínimas |
| `hoursPlayedMax` | number 0–100000 | — | Horas jogadas máximas |
| `timesFinishedMin` | integer 0–10000 | — | Vezes zerado mínimas |
| `timesFinishedMax` | integer 0–10000 | — | Vezes zerado máximas |
| `ratingMin` | number 0–10 | — | Nota mínima |
| `ratingMax` | number 0–10 | — | Nota máxima |

Ordenação: `updatedAt` decrescente (mais recente primeiro). Não configurável.

```bash
curl -b cookies.txt "http://localhost:1337/api/games?search=zelda&platform=N64&ratingMin=7&page=1&limit=20"
```

```js
const res = await fetch(
  "http://localhost:1337/api/games?search=zelda&ratingMin=7&page=1&limit=20",
  { credentials: "include" },
);
const { data, pagination } = await res.json();
```

Resposta:

```json
{
  "data": [ ... ],
  "pagination": { "page": 1, "limit": 20, "total": 143, "totalPages": 8, "hasNextPage": true, "hasPreviousPage": false }
}
```

### GET /api/games/stats

Aceita os mesmos filtros de `GET /api/games` (exceto `page` e `limit`). Retorna aggregates sobre a biblioteca filtrada.

```bash
curl -b cookies.txt "http://localhost:1337/api/games/stats?platform=N64&ratingMin=7"
```

```js
const data = await (
  await fetch("http://localhost:1337/api/games/stats?platform=N64", {
    credentials: "include",
  })
).json();
// data.data.totalGames, totalHoursPlayed, averageRating, byStatus, byGenre, byPlatform,
// byDeveloper, byPublisher, byReleaseYear, byRating
```

Resposta `200`:

```json
{
  "data": {
    "totalGames": 42,
    "totalHoursPlayed": 320.5,
    "totalTimesFinished": 15,
    "averageRating": 8.2,
    "averageHoursPlayed": 7.6,
    "averageTimesFinished": 0.36,
    "byStatus": { "finished": 10, "playing": 5, ... },
    "byGenre": { "RPG": 12, "Action": 8, ... },
    "byPlatform": { "PS5": 15, "Switch": 10, ... },
    "byDeveloper": { "Nintendo": 8, ... },
    "byPublisher": { "Sony": 10, ... },
    "byReleaseYear": { "2023": 5, "2024": 8, ... },
    "byRating": { "8": 5, "9": 3, ... }
  }
}
```

### GET /api/games/:gameId

```bash
curl -b cookies.txt http://localhost:1337/api/games/GAME_ID
```

Resposta `200`: `{ "data": { ...UserGame com game populated } }`

### PATCH /api/games/:gameId

Atualiza campos pessoais. Metadata global só é editável em jogos `source="manual"`.

```bash
curl -b cookies.txt -X PATCH http://localhost:1337/api/games/GAME_ID \
  -H "Content-Type: application/json" \
  -d '{"status": "dropped", "rating": 6}'
```

```js
await fetch(`http://localhost:1337/api/games/${gameId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ status: "dropped", rating: 6 }),
});
```

Body: pelo menos um campo obrigatório. Campos pessoais: `status`, `hoursPlayed`, `timesFinished`, `rating` (nullable), `review` (nullable). Campos de metadata (somente para `source="manual"`): `game.name`, `game.cover`, `game.genres`, `game.platforms`, `game.developers`, `game.publishers`, `game.releaseDate` (nullable), `game.summary`.

Resposta `200`: `{ "data": { ...UserGame atualizado } }`

### PUT /api/games/:gameId

Aceita o mesmo body e schema do `PATCH`. Funciona como alias.

### DELETE /api/games/:gameId

```bash
curl -b cookies.txt -X DELETE http://localhost:1337/api/games/GAME_ID
```

```js
await fetch(`http://localhost:1337/api/games/${gameId}`, {
  method: "DELETE",
  credentials: "include",
}); // 204 No Content
```

Resposta `204`: Sem body.

### POST/DELETE /api/games/:gameId/lists/:listId

Adiciona/remove uma etiqueta de lista de um jogo (idempotente).

```bash
curl -b cookies.txt -X POST http://localhost:1337/api/games/GAME_ID/lists/LIST_ID
curl -b cookies.txt -X DELETE http://localhost:1337/api/games/GAME_ID/lists/LIST_ID
```

```js
await fetch(`http://localhost:1337/api/games/${gameId}/lists/${listId}`, {
  method: "POST",
  credentials: "include",
}); // 204 No Content
```

Resposta `204`: Sem body.

## Game Lists (`/api/game-lists`) — todas exigem auth

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/game-lists` | Listas do usuário |
| POST | `/api/game-lists` | Cria lista |
| GET | `/api/game-lists/:listId` | Uma lista |
| PATCH | `/api/game-lists/:listId` | Renomeia |
| DELETE | `/api/game-lists/:listId` | Remove a lista (jogos são preservados) |
| GET | `/api/game-lists/:listId/games` | Jogos da lista (mesmos filtros de `/api/games`) |

### POST /api/game-lists

```bash
curl -b cookies.txt -X POST http://localhost:1337/api/game-lists \
  -H "Content-Type: application/json" \
  -d '{"name": "Backlog"}'
```

```js
await fetch("http://localhost:1337/api/game-lists", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ name: "Backlog" }),
});
```

Body: `{ "name": string (1–100 chars) }`

Resposta `201`: `{ "data": { "_id", "name", "userId", "createdAt", "updatedAt" } }`

### GET /api/game-lists

Query params:

| Param | Tipo | Default | Descrição |
|---|---|---|---|
| `page` | int ≥ 1 | 1 | Página |
| `limit` | int 1–100 | 20 | Itens por página |
| `search` | string | — | Busca por nome |
| `withCount` | `"true"` \| `"false"` | `"false"` | Incluir contagem de jogos |

Ordenação: `name` ascendente (alfabética). Não configurável.

```bash
curl -b cookies.txt "http://localhost:1337/api/game-lists?search=rpg&withCount=true&page=1&limit=20"
```

```js
const { data, pagination } = await (
  await fetch("http://localhost:1337/api/game-lists?withCount=true", {
    credentials: "include",
  })
).json();
```

Com `withCount=true`, cada lista inclui `gameCount`.

Resposta:

```json
{
  "data": [ { "_id", "name", "userId", "gameCount", "createdAt", "updatedAt" } ],
  "pagination": { "page": 1, "limit": 20, "total": 5, "totalPages": 1, "hasNextPage": false, "hasPreviousPage": false }
}
```

### GET /api/game-lists/:listId

```bash
curl -b cookies.txt http://localhost:1337/api/game-lists/LIST_ID
```

Resposta `200`: `{ "data": { "_id", "name", "userId", "createdAt", "updatedAt" } }`

### PATCH /api/game-lists/:listId

```bash
curl -b cookies.txt -X PATCH http://localhost:1337/api/game-lists/LIST_ID \
  -H "Content-Type: application/json" \
  -d '{"name": "Backlog 2026"}'
```

```js
await fetch(`http://localhost:1337/api/game-lists/${listId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ name: "Backlog 2026" }),
});
```

Body: `{ "name": string (1–100 chars) }`

Resposta `200`: `{ "data": { ...lista atualizada } }`

### DELETE /api/game-lists/:listId

```bash
curl -b cookies.txt -X DELETE http://localhost:1337/api/game-lists/LIST_ID
```

```js
await fetch(`http://localhost:1337/api/game-lists/${listId}`, {
  method: "DELETE",
  credentials: "include",
}); // 204 No Content
```

Resposta `204`: Sem body.

### GET /api/game-lists/:listId/games

Mesmos filtros de `GET /api/games` (exceto `listId`).

```bash
curl -b cookies.txt "http://localhost:1337/api/game-lists/LIST_ID/games?genre=RPG&page=1&limit=20"
```

```js
const res = await fetch(
  `http://localhost:1337/api/game-lists/${listId}/games?genre=RPG`,
  { credentials: "include" },
);
```

Resposta: `{ "data": [...], "pagination": { ... } }`

---

# Erros

Formato previsível em todas as rotas:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "password: too small"
  }
}
```

Códigos comuns: `UNAUTHENTICATED` (401), `VALIDATION_ERROR` / `INVALID_QUERY` (400), `GAME_NOT_FOUND` / `LIST_NOT_FOUND` (404), erro interno (500). Resultado vazio em coleções é `200` com `data: []`.

# Autenticação

A API usa JWT em cookie HTTP-only (`token`). Após login, o cookie é enviado automaticamente em todas as requests com `credentials: "include"`.

O cookie é invalidado ao fazer logout ou ao alterar a senha (session versioning — cada mudança de senha incrementa a versão da sessão, invalidando todos os tokens anteriores).

# Arquitetura

```
src/
├── app.ts               # app Express + rotas montadas
├── server.ts            # bootstrap HTTP + conexão Mongo
├── config/              # env validada (Zod), conexão MongoDB
├── controllers/         # camada HTTP
├── middleware/          # auth (JWT cookie), validação Zod, erros
├── models/              # User, GlobalGame, UserGame, GameList
├── routes/
├── schemas/             # schemas Zod
├── services/            # regras de negócio + queries
└── utils/
docs/                    # especificação arquitetural (fonte da verdade)
tests/                   # Vitest + Supertest + MongoDB em memória
```

# TODO — Melhorias técnicas

| Arquivo | Melhoria sugerida |
|---|---|
| `src/controllers/game.controller.ts` | Casts restantes `req.query as unknown as ...` em coleções — express@5 não preserva tipos de query; considerar parser próprio ou `z.infer` + parse manual |
| `src/services/game.service.ts` | Casts residuais em `createGame`/`updateGame` (`as UserGameDocument & { game }`, `globalGame!`) — modelar retorno com tipo próprio em vez de cast |
| `src/services/game.service.ts:262` | Dedupe manual por `name + source:"manual"` pode sofrer race condition; adicionar unique index em `slug` e tratar erro 11000 na criação do GlobalGame |
| `src/schemas/game.schema.ts` | Campos de metadata duplicados entre `createGameSchema.game` e `updateGameSchema.game` — extrair objetos base compartilhados |
| `src/middleware/auth.middleware.ts` | Cookie `maxAge` hardcoded (7d) deveria derivar de `env.JWT_EXPIRES_IN` |
| `src/services/stats.service.ts` | `$lookup`/`$unwind` roda sobre toda a biblioteca filtrada; avaliar índices compostos conforme crescimento |
| `src/app.ts` | Adicionar rate limiting nas rotas de auth (`/register`, `/login`) antes de expor publicamente |
| `tests/helpers.ts` | Usuários fixos impedem paralelismo das suítes; gerar dados únicos por teste se o pool mudar de `singleFork` |
| Integração ATP (docs §30) | Fora de escopo até o core fechar; definir interface API ↔ ATP quando iniciada |
