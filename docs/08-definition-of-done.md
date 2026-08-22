# Save State API — Definition of Done

Este documento define quando uma etapa ou funcionalidade da **Save State API** pode ser considerada realmente concluída.

> **"Funciona" não significa necessariamente "Done".**

Uma implementação só deve ser considerada concluída quando estiver alinhada à arquitetura, segura, validada, testada e documentada.

Os documentos existentes em `docs/` continuam sendo a fonte de verdade arquitetural.

---

## 1. Critérios gerais

Uma etapa só pode ser marcada como **Done** quando:

* [ ] A implementação respeita os documentos de `docs/`.
* [ ] Não introduz regras de domínio não definidas.
* [ ] Não copia deliberadamente comportamentos incorretos do legado.
* [ ] O TypeScript compila sem erros.
* [ ] Os testes relevantes passam.
* [ ] Não existem erros conhecidos introduzidos pela alteração.
* [ ] O agente explicou o que foi feito e por quê.
* [ ] O agente informou os arquivos criados/modificados.
* [ ] O agente informou os testes executados.
* [ ] O agente informou limitações, riscos ou pendências.
* [ ] A alteração não ampliou desnecessariamente o escopo.

---

# 2. Arquitetura

A arquitetura deve preservar:

```text
Save State UI
    ↓ HTTP
Save State API
    ↓
MongoDB

ATP Engine
    ↑
    └── integração futura e independente
```

### Critérios

* [ ] A API é independente da UI.
* [ ] A API é o único componente do Save State que acessa diretamente o MongoDB.
* [ ] A UI não conhece Mongoose ou models internos da API.
* [ ] A ATP Engine não controla usuários, autenticação, listas ou ownership.
* [ ] O Save State funciona sem a ATP Engine.
* [ ] Java/Spring Boot não foi introduzido prematuramente.
* [ ] Não foram adicionadas dependências externas sem necessidade.

---

# 3. Domínio

O domínio deve ser baseado em:

```text
User
GlobalGame
UserGame
GameList
```

Relacionamento:

```text
User
 │
 ├── UserGame ───────► GlobalGame
 │      │
 │      └────────────► GameList[]
 │
 └── GameList
```

### Critérios

* [ ] `GlobalGame` representa metadata global.
* [ ] `UserGame` representa a relação pessoal do usuário com um jogo.
* [ ] `GameList` representa uma lista/tag do usuário.
* [ ] `UserGame.gameId` é obrigatório.
* [ ] `UserGame.listIds` representa a relação jogo/lista.
* [ ] Um jogo pode existir sem listas.
* [ ] Uma lista pode existir sem jogos.
* [ ] Um jogo pode pertencer a várias listas.
* [ ] Dados pessoais não estão em `GlobalGame`.

---

# 4. GlobalGame

### Critérios

* [ ] Pode ser compartilhado entre vários usuários.
* [ ] Não pertence diretamente a um usuário.
* [ ] Não contém `rating`, `review`, `hours_played`, `times_finished`, `status` ou `listIds` pessoais.
* [ ] Alterações em `UserGame` não alteram `GlobalGame`.
* [ ] Remover um `UserGame` não remove o `GlobalGame`.
* [ ] Cadastro manual pode criar `GlobalGame` com `source="manual"`.

---

# 5. UserGame

### Critérios

* [ ] Pertence a exatamente um usuário.
* [ ] Possui `gameId` apontando para `GlobalGame`.
* [ ] Contém os dados pessoais do usuário.
* [ ] `listIds` referencia somente listas do mesmo usuário.
* [ ] Usuário não consegue acessar UserGames de outro usuário.
* [ ] Remover UserGame não remove GlobalGame.
* [ ] Remover UserGame não remove GameList.

Dados pessoais incluem:

```text
status
hours_played
times_finished
rating
review
listIds
```

---

# 6. GameList

GameList é uma **tag/lista**, não um container de jogos.

### Critérios

* [ ] Pertence a exatamente um usuário.
* [ ] Pode existir sem jogos.
* [ ] Não possui uma coleção de UserGames como fonte de verdade.
* [ ] A relação verdadeira é `UserGame.listIds`.
* [ ] Um jogo pode pertencer a várias listas.
* [ ] Um jogo pode não pertencer a nenhuma lista.

---

# 7. Exclusão de lista

Para:

```text
DELETE /api/game-lists/:listId
```

### Critérios

* [ ] Usuário está autenticado.
* [ ] Lista pertence ao usuário autenticado.
* [ ] Lista é removida.
* [ ] O `listId` é removido dos UserGames daquele usuário.
* [ ] Nenhum UserGame é removido.
* [ ] Nenhum GlobalGame é removido.
* [ ] Outras listas permanecem intactas.
* [ ] Outros usuários não são afetados.

---

# 8. Exclusão de jogo

Para:

```text
DELETE /api/games/:gameId
```

### Critérios

* [ ] Usuário está autenticado.
* [ ] O UserGame pertence ao usuário.
* [ ] O UserGame é removido.
* [ ] O GlobalGame permanece.
* [ ] GameLists permanecem.
* [ ] Outros usuários não são afetados.

---

# 9. Cadastro manual

### Critérios

* [ ] Usuário consegue cadastrar jogo manualmente.
* [ ] ATP não é necessária.
* [ ] API cria `GlobalGame`.
* [ ] `GlobalGame.source` pode ser `"manual"`.
* [ ] API cria `UserGame`.
* [ ] `UserGame.gameId` permanece obrigatório.
* [ ] Não existe UserGame sem GlobalGame.

---

# 10. Autenticação

Endpoints:

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/logout
```

### Critérios

* [ ] Registro funciona.
* [ ] Email duplicado é rejeitado.
* [ ] Senha é armazenada com hash seguro.
* [ ] Login válido funciona.
* [ ] Login inválido é rejeitado.
* [ ] JWT é assinado corretamente.
* [ ] JWT é armazenado em cookie HTTP-only.
* [ ] Logout limpa/invalida o cookie.
* [ ] JWT inválido não concede acesso.
* [ ] `/api/auth/me` representa corretamente o usuário autenticado.
* [ ] O usuário autenticado é determinado pelo JWT.

Nunca usar como autoridade:

```text
req.body.userId
req.query.userId
req.params.userId
```

---

# 11. Ownership

Esta é uma **regra crítica de segurança**.

### Critérios

* [ ] User A não consegue ler Game de B.
* [ ] User A não consegue atualizar Game de B.
* [ ] User A não consegue apagar Game de B.
* [ ] User A não consegue ler List de B.
* [ ] User A não consegue atualizar List de B.
* [ ] User A não consegue apagar List de B.
* [ ] User A não consegue colocar seu Game em List de B.
* [ ] User A não consegue colocar Game de B em sua List.
* [ ] Ownership é derivado do JWT.
* [ ] Operações envolvendo Game + List verificam ownership dos dois lados.

Consultar por `_id` não é suficiente quando existe ownership.

---

# 12. Validação

### Critérios

* [ ] Body é validado.
* [ ] Params são validados.
* [ ] Query parameters são validados.
* [ ] Valores inválidos retornam `400`.
* [ ] Tipos incorretos são rejeitados.
* [ ] `limit` possui máximo.
* [ ] Datas inválidas são rejeitadas.
* [ ] Ratings fora de `0..10` são rejeitados.
* [ ] Valores negativos onde não são permitidos são rejeitados.

---

# 13. GET de collections

As seguintes rotas obrigatoriamente possuem:

```text
GET /api/games
GET /api/game-lists
GET /api/game-lists/:listId/games
```

### Critérios

* [ ] Possuem paginação.
* [ ] Possuem search quando aplicável.
* [ ] Possuem validação de query.
* [ ] Possuem tratamento de erro.
* [ ] Retornam status HTTP adequado.
* [ ] Retornam mensagens explícitas de erro.
* [ ] Resultado vazio retorna `200`.
* [ ] Nunca retornam coleção ilimitada.
* [ ] Retornam metadata de paginação.

---

# 14. Search

### Games

```text
search → GlobalGame.name
```

Deve ser:

* [ ] case-insensitive;
* [ ] parcial;
* [ ] por containment;
* [ ] independente de igualdade exata.

Exemplo:

```text
search=zelda
```

deve encontrar:

```text
The Legend of Zelda
Zelda II: The Adventure of Link
The Legend of Zelda: Ocarina of Time
```

### Lists

```text
search → GameList.name
```

Também deve ser:

* [ ] case-insensitive;
* [ ] parcial.

---

# 15. Pagination

### Critérios

* [ ] `page` é suportado.
* [ ] `limit` é suportado.
* [ ] Existe limite máximo de `limit`.
* [ ] Valores inválidos são rejeitados.
* [ ] `total` é correto.
* [ ] `totalPages` é correto.
* [ ] `hasNextPage` é correto.
* [ ] `hasPreviousPage` é correto.
* [ ] Paginação ocorre no banco.
* [ ] Não carregar a coleção inteira para depois paginar em memória.

Formato conceitual:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 143,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

# 16. Filters

`GET /api/games` deve suportar:

```text
search
listId
genre
platform
developer
publisher
releaseDateFrom
releaseDateTo
hoursPlayedMin
hoursPlayedMax
timesFinishedMin
timesFinishedMax
ratingMin
ratingMax
```

### Critérios

* [ ] Todos os filtros definidos são suportados.
* [ ] Filtros podem ser combinados.
* [ ] Combinação possui semântica AND.
* [ ] Cada filtro consulta a origem correta.
* [ ] Filtros inválidos retornam `400`.
* [ ] Filtros respeitam ownership.
* [ ] Filtros funcionam junto com paginação.

Mapeamento:

```text
search
→ GlobalGame.name

listId
→ UserGame.listIds

genre
→ GlobalGame.genres

platform
→ GlobalGame.platforms

developer
→ GlobalGame.developers

publisher
→ GlobalGame.publishers

releaseDate*
→ GlobalGame.release_date

hoursPlayed*
→ UserGame.hours_played

timesFinished*
→ UserGame.times_finished

rating*
→ UserGame.rating
```

---

# 17. Query compartilhada

A semântica de filtros deve ser compartilhada por:

```text
GET /api/games
GET /api/game-lists/:listId/games
GET /api/games/stats
```

### Critérios

* [ ] Existe definição central da query.
* [ ] Parser/validation pode ser reutilizado.
* [ ] Os endpoints não possuem interpretações divergentes dos mesmos filtros.
* [ ] `listId` da rota de listas funciona como restrição adicional.
* [ ] Dashboard usa exatamente a mesma semântica.

---

# 18. GameList count

Quando existir:

```text
withCount=true
```

### Critérios

* [ ] `gamesCount` é derivado de `UserGame.listIds`.
* [ ] Apenas UserGames do usuário são considerados.
* [ ] Count é calculado no MongoDB quando apropriado.
* [ ] Não carrega toda a biblioteca em memória apenas para contar.
* [ ] Count não é tratado como fonte verdadeira da relação.

---

# 19. Dashboard / Statistics

A dashboard deve consultar a API.

Nunca:

```text
Frontend
↓
20 jogos da página atual
↓
estatísticas
```

Correto:

```text
Frontend
↓
filtros
↓
API
↓
universo completo filtrado
↓
estatísticas
```

### Critérios

* [ ] Existe endpoint de estatísticas.
* [ ] Aceita os mesmos filtros de Games.
* [ ] Estatísticas consideram todos os resultados filtrados.
* [ ] Paginação não altera as estatísticas.
* [ ] Dashboard respeita ownership.
* [ ] Não existe segunda implementação independente dos filtros.

Métricas possíveis:

```text
totalGames
totalHoursPlayed
totalTimesFinished
averageRating
averageHoursPlayed
averageTimesFinished
```

Distribuições possíveis:

```text
byStatus
byGenre
byPlatform
byDeveloper
byPublisher
byReleaseYear
byRating
```

---

# 20. Error handling

### Critérios

* [ ] Existe middleware global de erros.
* [ ] Erros de validação retornam `400`.
* [ ] Não autenticado retorna `401`.
* [ ] Recurso inexistente/inacessível retorna `404` quando apropriado.
* [ ] Falhas inesperadas retornam `500`.
* [ ] Estrutura de erro é previsível.
* [ ] Mensagem explica o problema.
* [ ] Stack trace não é exposta.
* [ ] Secrets não são expostos.
* [ ] Detalhes internos do Mongoose não são vazados desnecessariamente.

Formato conceitual:

```json
{
  "error": {
    "code": "INVALID_QUERY",
    "message": "limit must be between 1 and 100"
  }
}
```

---

# 21. Empty results

Resultado vazio **não é erro**.

Exemplo:

```text
GET /api/games?search=nao-existe
```

deve retornar:

```text
HTTP 200
```

com:

```json
{
  "data": []
}
```

e metadata de paginação.

---

# 22. Models

### Critérios

* [ ] Models representam o domínio atual.
* [ ] Não utilizam o modelo legado `Game` como fonte de verdade.
* [ ] Referências Mongoose estão corretas.
* [ ] Índices necessários estão definidos.
* [ ] Campos obrigatórios possuem constraints.
* [ ] Limites numéricos estão definidos.
* [ ] Não existem schemas duplicados dentro de routes/controllers.

---

# 23. Services

### Critérios

* [ ] Regras de negócio estão na camada apropriada.
* [ ] Controllers não concentram toda a lógica.
* [ ] Services não dependem diretamente de `req`/`res`.
* [ ] Ownership é aplicado corretamente.
* [ ] Não existem abstrações genéricas artificiais.
* [ ] Não existe repository criado apenas por preferência arquitetural.

---

# 24. Controllers

### Critérios

* [ ] Controllers lidam principalmente com HTTP.
* [ ] Validação é aplicada.
* [ ] Services são chamados de forma previsível.
* [ ] Responses são consistentes.
* [ ] Queries complexas não ficam desnecessariamente dentro dos controllers.
* [ ] Controllers não duplicam regras de negócio.

---

# 25. Tests

Uma alteração relevante só pode ser considerada concluída quando possui testes proporcionais ao risco.

## Auth

* [ ] Register.
* [ ] Email duplicado.
* [ ] Login válido.
* [ ] Login inválido.
* [ ] JWT inválido.
* [ ] Logout.

## Ownership

* [ ] User A não lê Game de B.
* [ ] User A não altera Game de B.
* [ ] User A não apaga Game de B.
* [ ] User A não lê List de B.
* [ ] User A não altera List de B.
* [ ] User A não apaga List de B.
* [ ] Relação Game/List entre usuários diferentes é rejeitada.

## Domain

* [ ] Lista vazia é válida.
* [ ] Jogo sem lista é válido.
* [ ] Jogo em várias listas é válido.
* [ ] Apagar lista não apaga UserGame.
* [ ] Apagar lista não apaga GlobalGame.
* [ ] Apagar UserGame não apaga GlobalGame.

## Queries

* [ ] Pagination.
* [ ] Search parcial.
* [ ] Search case-insensitive.
* [ ] Filtros individuais.
* [ ] Filtros combinados.
* [ ] Datas.
* [ ] Horas.
* [ ] Times finished.
* [ ] Rating.
* [ ] List filter.
* [ ] Empty results.

## Dashboard

* [ ] Estatísticas respeitam filtros.
* [ ] Paginação não altera o universo estatístico.

---

# 26. TypeScript / Build

### Critérios

* [ ] TypeScript compila.
* [ ] Build passa.
* [ ] Não existem erros de tipo introduzidos.
* [ ] Queries possuem tipos coerentes.
* [ ] Responses possuem tipos coerentes.
* [ ] `any` não é utilizado sem justificativa.
* [ ] Type casts não escondem problemas reais.
* [ ] Tipos duplicados são evitados.

---

# 27. Database

### Critérios

* [ ] MongoDB conecta corretamente.
* [ ] URI vem de environment variable.
* [ ] Secrets não estão hardcoded.
* [ ] Queries respeitam ownership.
* [ ] Collections utilizam paginação.
* [ ] Aggregations são utilizadas quando apropriado.
* [ ] Não são carregadas grandes quantidades de dados para memória sem necessidade.

---

# 28. Environment / Security

### Critérios

* [ ] Existe `.env.example`.
* [ ] `.env` está no `.gitignore`.
* [ ] JWT secret não está hardcoded.
* [ ] MongoDB URI não está hardcoded.
* [ ] Credenciais não aparecem nos logs.
* [ ] Cookie possui configuração apropriada.
* [ ] Configuração de produção não depende acidentalmente de valores de desenvolvimento.

---

# 29. Código legado

Ao substituir código legado:

* [ ] O comportamento foi comparado com a arquitetura alvo.
* [ ] Bugs conhecidos não foram copiados.
* [ ] O modelo antigo `Game` não voltou a ser fonte de verdade.
* [ ] Duplicações foram removidas quando apropriado.
* [ ] Dependências do modelo legado foram identificadas.
* [ ] Compatibilidade temporária, caso necessária, está documentada.

---

# 30. ATP

ATP só entra no Definition of Done depois que o core do Save State estiver funcional.

Antes disso:

```text
ATP = fora de escopo
```

Quando chegar a hora:

* [ ] Save State funciona sem ATP.
* [ ] ATP pode estar offline sem quebrar operações básicas.
* [ ] Interface API ↔ ATP está definida.
* [ ] ATP não recebe responsabilidades de domínio do Save State.
* [ ] Integração está documentada.
* [ ] Falhas da ATP possuem tratamento adequado.

---

# 31. Definition of Done por etapa

Toda etapa deve terminar com:

```text
Implementação
↓
Validação
↓
Testes
↓
Revisão contra docs/
↓
Explicação
```

O agente deve reportar:

```markdown
## Etapa concluída

### O que foi feito

...

### Arquivos alterados

...

### Decisões importantes

...

### Testes executados

...

### Resultado

✅ Done

ou

⚠️ Parcial — pendências:
- ...

### Próxima etapa

...
```

---

# 32. Definition of Done do projeto inteiro

O **Save State API** só pode ser considerado completamente concluído quando:

* [ ] Auth completo.
* [ ] JWT/cookie funcionando.
* [ ] Ownership validado.
* [ ] User implementado.
* [ ] GlobalGame implementado.
* [ ] UserGame implementado.
* [ ] GameList implementado.
* [ ] CRUD de Games implementado.
* [ ] CRUD de GameLists implementado.
* [ ] Relação Game/List implementada.
* [ ] Exclusão de lista respeita o domínio.
* [ ] Exclusão de jogo remove apenas UserGame.
* [ ] Cadastro manual funciona sem ATP.
* [ ] Search funciona.
* [ ] Pagination funciona.
* [ ] Filters funcionam.
* [ ] Filtros podem ser combinados.
* [ ] GET de jogos de uma lista utiliza a mesma semântica de filtros.
* [ ] Dashboard/statistics funciona.
* [ ] Dashboard respeita os filtros.
* [ ] Empty results são tratados corretamente.
* [ ] Error handling global funciona.
* [ ] Status HTTP estão corretos.
* [ ] Mensagens de erro são explícitas.
* [ ] Testes de autenticação existem.
* [ ] Testes de ownership existem.
* [ ] Testes de domínio existem.
* [ ] Testes de queries existem.
* [ ] Testes de dashboard existem.
* [ ] TypeScript/build passam.
* [ ] Secrets não estão hardcoded.
* [ ] Documentação está atualizada.
* [ ] O modelo legado não é fonte de verdade.
* [ ] ATP continua opcional.
* [ ] API está pronta para integração com a Save State UI.

---

# 33. Regra final

**"Funciona no meu computador" não significa Done.**

Done significa:

```text
Arquitetura correta
        +
Domínio correto
        +
Ownership correto
        +
Validação
        +
Error handling
        +
Testes
        +
Documentação
        +
Build funcionando
```

Se um desses elementos essenciais estiver faltando, a etapa deve ser considerada:

```text
⚠️ Parcial
```

e não:

```text
✅ Done
```
