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

Todas as rotas (exceto auth) exigem sessão: faça login primeiro; o JWT é salvo em cookie `token` (HTTP-only) automaticamente.

---

# Rotas

## Auth (`/api/auth`)

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Cria conta | Não |
| POST | `/api/auth/login` | Autentica (seta cookie) | Não |
| GET | `/api/auth/me` | Usuário autenticado | Sim |
| POST | `/api/logout` | Limpa cookie de sessão | Não |

### POST /api/auth/register

```bash
curl -c cookies.txt -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Seu Nome", "email": "voce@exemplo.com", "password": "minhasenha123"}'
```

```js
await fetch("http://localhost:3000/api/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ name: "Seu Nome", email: "voce@exemplo.com", password: "minhasenha123" }),
});
```

Resposta `201`:

```json
{ "data": { "id": "...", "name": "Seu Nome", "email": "voce@exemplo.com" } }
```

### POST /api/auth/login

```bash
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "voce@exemplo.com", "password": "minhasenha123"}'
```

```js
await fetch("http://localhost:3000/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ email: "voce@exemplo.com", password: "minhasenha123" }),
});
```

### GET /api/auth/me

```bash
curl -b cookies.txt http://localhost:3000/api/auth/me
```

```js
await fetch("http://localhost:3000/api/auth/me", {
  credentials: "include",
});
```

### POST /api/logout

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/logout
```

```js
await fetch("http://localhost:3000/api/logout", {
  method: "POST",
  credentials: "include",
});
```

## Games (`/api/games`) — todas exigem auth

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/games` | Lista paginada do usuário, com filtros |
| POST | `/api/games` | Adiciona jogo à biblioteca |
| GET | `/api/games/stats` | Estatísticas (mesmos filtros) |
| GET | `/api/games/:gameId` | Um jogo |
| PATCH | `/api/games/:gameId` | Atualiza dados pessoais (+ metadata se manual) |
| DELETE | `/api/games/:gameId` | Remove o jogo da biblioteca (mantém GlobalGame) |
| POST | `/api/games/:gameId/lists/:listId` | Adiciona etiqueta de lista (idempotente) |
| DELETE | `/api/games/:gameId/lists/:listId` | Remove etiqueta de lista |

### POST /api/games — metadata manual

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/games \
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
await fetch("http://localhost:3000/api/games", {
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

Alternativa: passe `"gameId": "<id de um GlobalGame existente>"` em vez de `game`.

### GET /api/games — filtros e paginação

Query params: `page`, `limit` (1–100), `search`, `listId`, `genre`, `platform`, `developer`, `publisher`, `releaseDateFrom`, `releaseDateTo`, `hoursPlayedMin`, `hoursPlayedMax`, `timesFinishedMin`, `timesFinishedMax`, `ratingMin`, `ratingMax`.

```bash
curl -b cookies.txt "http://localhost:3000/api/games?search=zelda&platform=N64&ratingMin=7&page=1&limit=20"
```

```js
const res = await fetch(
  "http://localhost:3000/api/games?search=zelda&ratingMin=7&page=1&limit=20",
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

Aceita os mesmos filtros de `GET /api/games`. Paginação não afeta o resultado.

```bash
curl -b cookies.txt "http://localhost:3000/api/games/stats?platform=N64&ratingMin=7"
```

```js
const data = await (
  await fetch("http://localhost:3000/api/games/stats?platform=N64", {
    credentials: "include",
  })
).json();
// data.data.totalGames, totalHoursPlayed, averageRating, byStatus, byGenre, byPlatform,
// byDeveloper, byPublisher, byReleaseYear, byRating
```

### PATCH /api/games/:gameId

Atualiza campos pessoais. Metadata global só é editável em jogos `source="manual"`.

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/games/GAME_ID \
  -H "Content-Type: application/json" \
  -d '{"status": "dropped", "rating": 6}'
```

```js
await fetch(`http://localhost:3000/api/games/${gameId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ status: "dropped", rating: 6 }),
});
```

Campos pessoais aceitos: `status` (`backlog` | `playing` | `replaying` | `stalled` | `dropped` | `limbo` | `endless` | `achievement` | `finished` | `wishlist`), `hoursPlayed`, `timesFinished`, `rating` (0–10), `review`. Campos de metadata dentro de `game`: `name`, `cover`, `genres`, `platforms`, `developers`, `publishers`, `releaseDate`, `summary`.

### DELETE /api/games/:gameId

```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/games/GAME_ID
```

```js
await fetch(`http://localhost:3000/api/games/${gameId}`, {
  method: "DELETE",
  credentials: "include",
}); // 204 No Content
```

### POST/DELETE /api/games/:gameId/lists/:listId

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/games/GAME_ID/lists/LIST_ID
curl -b cookies.txt -X DELETE http://localhost:3000/api/games/GAME_ID/lists/LIST_ID
```

```js
await fetch(`http://localhost:3000/api/games/${gameId}/lists/${listId}`, {
  method: "POST",
  credentials: "include",
}); // 204 No Content
```

## Game Lists (`/api/game-lists`) — todas exigem auth

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/game-lists` | Listas do usuário (`page`, `limit`, `search`, `withCount=true`) |
| POST | `/api/game-lists` | Cria lista |
| GET | `/api/game-lists/:listId` | Uma lista |
| PATCH | `/api/game-lists/:listId` | Renomeia |
| DELETE | `/api/game-lists/:listId` | Remove a lista (jogos são preservados) |
| GET | `/api/game-lists/:listId/games` | Jogos da lista (mesmos filtros de `/api/games`) |

### POST /api/game-lists

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/game-lists \
  -H "Content-Type: application/json" \
  -d '{"name": "Backlog"}'
```

```js
await fetch("http://localhost:3000/api/game-lists", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ name: "Backlog" }),
});
```

### GET /api/game-lists

```bash
curl -b cookies.txt "http://localhost:3000/api/game-lists?search=rpg&withCount=true&page=1&limit=20"
```

```js
const { data, pagination } = await (
  await fetch("http://localhost:3000/api/game-lists?withCount=true", {
    credentials: "include",
  })
).json();
```

Com `withCount=true`, cada lista inclui `gameCount`.

### PATCH /api/game-lists/:listId

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/game-lists/LIST_ID \
  -H "Content-Type: application/json" \
  -d '{"name": "Backlog 2026"}'
```

```js
await fetch(`http://localhost:3000/api/game-lists/${listId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ name: "Backlog 2026" }),
});
```

### DELETE /api/game-lists/:listId

```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/game-lists/LIST_ID
```

```js
await fetch(`http://localhost:3000/api/game-lists/${listId}`, {
  method: "DELETE",
  credentials: "include",
}); // 204 No Content
```

### GET /api/game-lists/:listId/games

Mesmos filtros de `GET /api/games` (sem `listId`).

```bash
curl -b cookies.txt "http://localhost:3000/api/game-lists/LIST_ID/games?genre=RPG&page=1&limit=20"
```

```js
const res = await fetch(
  `http://localhost:3000/api/game-lists/${listId}/games?genre=RPG`,
  { credentials: "include" },
);
```

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
