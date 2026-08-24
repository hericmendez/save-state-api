# 09 — Contexto de Desenvolvimento

> Registro do estado atual do projeto para retomada futura. Complementa os docs
> 01–08 (que permanecem a especificação/fonte da verdade). Última atualização: 2026-08-23.

## Status da dívida técnica (atualizado)

Corrigido nesta iteração:
1. ✅ Enum de status expandido para 10 valores: `backlog`, `playing`, `replaying`, `stalled`, `dropped`, `limbo`, `endless`, `achievement`, `finished`, `wishlist` (`src/models/user-game.ts`; espelhado no `GameForm.tsx` e `dashboard.ts` do web)
2. ✅ Dashboard com métricas por status: "Horas por status" e nova seção "Jogos por status" (contagem); métricas de concluídos agora baseadas em `timesFinished > 0` (não dependem do status `finished`) — removida a "taxa de conclusão"
3. ✅ CORS configurado para o frontend (`origin: http://localhost:5173`, `credentials: true`) — `src/app.ts`
4. ✅ Formulário web edita metadados manualmente (capa, lançamento, gêneros, plataformas, devs, publishers, sinopse) no POST/PUT; pré-preenchido ao editar
5. ✅ Script de seed `scripts/seed.ts`: usuário demo `demo@save-state.dev` / `demo12345`, 5 listas e 30 jogos reais distribuídos entre elas (todo jogo em ≥1 lista; cobre todos os 10 status). Idempotente; rodar com `pnpm exec tsx scripts/seed.ts`
6. ✅ Scripts npm: `mongo:dev` (sobe mongod sem auth na porta 27018, dbpath `.mongo-dev/`) e `dev:all`

Pendente (decisão futura):
- Performance do `$lookup/$unwind` do stats sobre toda a biblioteca filtrada
- Helpers de teste com usuários fixos ainda impedem paralelismo

## Front-end de teste (`web/`)

App Vite + React 18 (TypeScript), workspace pnpm configurado em `pnpm-workspace.yaml` (`packages: [., web]`). Estilização com **Tailwind CSS v4** (`@tailwindcss/vite` plugin em `vite.config.ts`; `styles.css` contém apenas `@import "tailwindcss"`).

Rodar (2 terminais):
- API: `pnpm dev` na raiz (porta 3000). Se o MongoDB local (27017) exigir auth, subir instância dev: `mongod --port 27018 --dbpath <dir>` e iniciar a API com `MONGODB_URI=mongodb://127.0.0.1:27018/save-state pnpm dev`
- Web: `pnpm dev` dentro de `web/` (porta 5173, proxy `/api` → localhost:3000)

Estrutura (modularizada por responsabilidade):
- `src/api.ts` — cliente HTTP tipado (`request<T>`, `credentials: include`, unwrap `{ data }`)
- `src/lib/ui.ts` — classes Tailwind compartilhadas (botões, inputs, cards)
- `src/components/` — `Header` (+ `HeaderUser`, `BackButton`), `Message`, `AuthForm`, `GameDetail`, `GameRow`/`GameRowList`, `ListsSection`, `GameForm`
- `src/Dashboard.tsx` + `src/dashboard.ts` — view e lógica pura do dashboard
- `src/App.tsx` — apenas estado global, handlers e roteamento entre views (`home | list | detail | dashboard`)

Dashboard (métricas calculadas no client a partir de `/api/games`, que já popula genres/platforms/releaseDate):
1. Jogos mais jogados (top 10 por horas)
2. Gêneros mais jogados (horas somadas)
3. Plataformas mais jogadas (horas somadas)
4. Total de horas jogadas + horas por status
5. Taxa de conclusão = zerados / (jogando + dropados) — enum fixo `Status { PLAYING, FINISHED, DROPPED }` em `dashboard.ts`
6. Jogos zerados: total, por ano, por plataforma e por gênero

Funcionalidades:
- Auth: register, login, me (chamado no load), logout — sessão via cookie HTTP-only, `credentials: include`
- CRUD de games autenticado: GET lista (`/api/games?limit=100`, filtro opcional `listId`), POST criar (com metadata manual; entra na lista ativa se houver), PUT editar, DELETE remover
- Listas: criar, renomear (inline, PATCH), excluir (remove a tag dos jogos no backend); painel com contagem (`withCount=true`); clicar numa lista filtra a biblioteca
- Listas ↔ jogos: chips por jogo mostrando pertenças com × para remover; "adicionar/copiar p/ lista" via select; "mover para…" (remove das listas atuais e adiciona ao destino)
- Tratamento de 401 → volta para tela de login; erros da API exibidos via `{ error: { message } }`

Verificado end-to-end via curl através do proxy do Vite: register/login/me/logout, 401 sem cookie, POST→GET→PUT→DELETE de jogos e fluxo completo de listas (criar/renomear/excluir, add/remover jogo, cópia em múltiplas listas, contagens). Dashboard verificado via typecheck/build do Vite.

## O que é o projeto

Backend da **Save State** — biblioteca pessoal de jogos com listas, filtros e dashboard de estatísticas.
Parte de um ecossistema de 3 projetos: **UI (React/Vite)**, **API (este repo)** e **ATP Engine**.
A integração com o ATP Engine está **fora de escopo por enquanto** (`README.md`).

## Stack

- TypeScript 5.8 (strict, NodeNext, ES2022)
- Express 5.1 + Mongoose 8.16 / MongoDB
- `bcryptjs`, `cookie-parser`, `dotenv`, `jsonwebtoken`, `slugify`, `zod` v4
- Dev: vitest 4, supertest, mongodb-memory-server, tsx
- Gerenciador: **pnpm** (workspace) — atenção: existe também um `package-lock.json` residual junto do `pnpm-lock.yaml`

## Arquitetura

Camadas rígidas: `routes → validation(Zod) → controller → service → model`.

Rotas montadas em `/api` (`src/app.ts`):
- **Auth**: `POST /api/auth/register|login`, `GET /api/auth/me`, `POST /api/logout`
- **Games** (auth obrigatório): CRUD `/api/games`, `GET /api/games/stats`, tags de lista `POST/DELETE /api/games/:gameId/lists/:listId`
- **Game-lists**: CRUD `/api/game-lists`, `GET /api/game-lists/:listId/games`

Models:
- `User` — name/email(unique)/passwordHash
- `GlobalGame` — metadata compartilhada; `slug` unique; `source: "manual" | "atp"`
- `UserGame` — dados pessoais por usuário; índice único `{userId, gameId}`; status enum backlog/playing/finished/dropped/wishlist
- `GameList` — `{userId, name}` com unique composto

Sem migrations — MongoDB sem schema rígido, índices declarados nos models.

## Autenticação e segurança

- JWT em cookie HTTP-only `token`; `requireAuth` injeta `req.user.id` (`src/middleware/auth.middleware.ts`)
- Cookie: `secure` apenas em produção, `sameSite: lax`; senha com bcrypt (cost 10)
- Env validado por Zod em `src/config/env.ts`: `NODE_ENV`, `PORT` (3000), `MONGODB_URI` (localhost/save-state), `JWT_SECRET` (mín. 32 chars — processo falha se inválido), `JWT_EXPIRES_IN` ("7d")
- `.env` local existe com segredo placeholder; `.env.example` citado no README mas **não existe no repo**

## Erros e contratos

- `ApiError` tipada (`src/utils/api-error.ts`) + `errorMiddleware` (CastError → 400)
- Erro sempre `{ error: { code, message } }`, códigos UPPER_SNAKE
- Sucesso `{ data, pagination? }`; paginação padrão page=1/limit=20; busca case-insensitive com regex escapado

## Testes

5 suítes, **47 testes, todos passando** (~2s): auth (10), ownership entre usuários A/B (11), domain/invariantes (11), queries/filtros (11), stats/dashboard (6).
Vitest + Supertest + MongoMemoryServer; helpers centralizados em `tests/helpers.ts` (usuários fixos userA/userB impede paralelismo); `vitest.config.ts` usa `pool: forks` + `singleFork` + timeouts longos.

Scripts: `dev` (tsx watch --env-file=.env), `build`, `start`, `typecheck`, `test`.

## Dívida técnica conhecida

Itens 1–6 e 8 da tabela original do README foram resolvidos em iterações anteriores
(ver seção "Status da dívida técnica" acima). Restante:

1. Stats `$lookup/$unwind` sobre toda a biblioteca filtrada — performance futura

Outros: nenhum TODO/FIXME no código (dívida só no README); `dist/` presente localmente apesar do .gitignore.

## Convenções

- TS strict, ESM/NodeNext; controllers thin (só HTTP), services concentram regras de negócio
- Validação 100% via Zod; middleware `validate({body/query/params})` substitui `req[part]` pelo dado parseado
- Commits em inglês (conventional-commits: feat/fix/chore/refactor); testes descritivos em inglês; docs em português
