# Save State API — Development and Migration Plan

## 1. Purpose

The current Save State implementation was originally built as a Next.js application.

The new architecture extracts the backend into an independent Express API.

This is not a simple file move.

The migration also completes the transition from the legacy Game model to the intended:

    GlobalGame
        +
    UserGame
        +
    GameList


---

# 2. Legacy Model

The current legacy Game model combines:

    userId
    game_data
    player_data
    player_data.listIds


This model currently powers several routes.

It should not remain the long-term center of the domain.

---

# 3. Target Model

The target domain is:

    User
      |
      +---- UserGame ----> GlobalGame
      |         |
      |         +-------> GameList[]
      |
      +---- GameList


---

# 4. Migration Direction

Legacy:

    Game
      ├── userId
      ├── game_data
      └── player_data
           └── listIds


Target:

    GlobalGame
      └── global metadata


    UserGame
      ├── userId
      ├── gameId
      ├── personal data
      └── listIds


    GameList
      ├── userId
      └── name


---

# 5. Migration of Existing Games

A legacy Game record contains both global and personal information.

For each existing Game:

1. Extract global metadata.
2. Find or create the corresponding GlobalGame.
3. Create a UserGame referencing GlobalGame.
4. Copy personal/player data to UserGame.
5. Copy player_data.listIds to UserGame.listIds.
6. Ensure referenced lists belong to the same user.
7. Verify migrated counts.

The migration must preserve the user's library.

---

# 6. Legacy List Relationship

The current implementation stores:

    Game.player_data.listIds


The target implementation stores:

    UserGame.listIds


All new API logic must use UserGame.listIds.

The legacy Game relationship must not be treated as the target design.

---

# 7. Duplicate Legacy Routes

The current code contains duplicated game route implementations.

The new Express API must have one authoritative implementation per endpoint.

Do not copy duplicated routes blindly.

---

# 8. Model Duplication

The current code also defines a GameList schema inside a route even though a GameList model already exists.

The new API must define the Mongoose model once.

Routes and services must import the canonical model.

---

# 9. Authentication Migration

Current Next.js behavior:

    Next.js route
        |
        v
    cookies()
        |
        v
    token
        |
        v
    JWT verify


Target Express behavior:

    Request
       |
       v
    Express auth middleware
       |
       v
    read token cookie
       |
       v
    verify JWT
       |
       v
    req.user
       |
       v
    controller/service


Authentication semantics should remain compatible with the current frontend where practical.

---

# 10. API Compatibility

The new API should preserve the existing REST concepts where reasonable.

The frontend should not need to understand whether the backend is:

- Next.js;
- Express;
- another Node framework.

Only the HTTP contract matters.

---

# 11. Migration Order

Recommended order:

### Phase 1 — Backend foundation

- Express project
- TypeScript
- configuration
- environment variables
- MongoDB connection
- error middleware
- request validation

### Phase 2 — Authentication

- User model
- register
- login
- JWT
- cookie handling
- auth middleware
- me
- logout

### Phase 3 — Domain models

- GlobalGame
- UserGame
- GameList

### Phase 4 — Core Game API

- list games
- search
- pagination
- filters
- get game
- create game
- update game
- delete game

### Phase 5 — Game Lists

- list lists
- search lists
- pagination
- create list
- update list
- delete list
- counts

### Phase 6 — Relationships

- add game to list
- remove game from list
- ownership validation

### Phase 7 — Statistics

- filtered statistics
- dashboard aggregation
- reuse GameQuery

### Phase 8 — Frontend migration

Replace Next API calls with Save State API calls.

### Phase 9 — Tests

Add:

- auth tests;
- ownership tests;
- CRUD tests;
- relationship tests;
- query/filter tests;
- statistics tests.

### Phase 10 — ATP

Only after the core Save State system is functional.

---

# 12. ATP Integration

The API may expose a client such as:

    atp.client.ts


The client communicates with ATP over HTTP.

The API should not import ATP scraper implementation code.

---

# 13. ATP Failure

A failed ATP request must not break core CRUD.

Manual game creation must continue working.

---

# 14. Java Migration

ATP may later be rewritten in Java/Spring Boot.

This must not require a rewrite of Save State UI.

The expected architectural boundary is:

    Save State API
          |
       HTTP API
          |
          v
    ATP Engine


The language used by ATP is an implementation detail.

---

# 15. Development Priority

The project must prioritize finishing the Save State core before beginning the Java/Spring Boot ATP rewrite.

The ATP Engine is intentionally the experimental/laboratory component.

Do not allow ATP experimentation to block:

- authentication;
- game CRUD;
- GameList CRUD;
- ownership;
- filtering;
- pagination;
- dashboard statistics.

---

# 16. Definition of Core API Completion

The Save State API is considered functionally complete for the first major milestone when it supports:

- register;
- login;
- logout;
- authenticated user;
- protected resources;
- user isolation;
- GlobalGame;
- UserGame;
- GameList;
- manual game creation;
- game CRUD;
- list CRUD;
- game/list relationships;
- empty lists;
- games without lists;
- pagination;
- name search;
- game filters;
- list search;
- statistics;
- dashboard query semantics;
- explicit API errors.

Only after this milestone should ATP integration become a major development focus.