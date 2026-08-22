# Save State API

Backend API for the Save State game library application.

The Save State ecosystem is divided into three independent projects:

- Save State UI
- Save State API
- ATP Engine

## Save State UI

The frontend application.

Technology:

- React
- Vite
- Zustand
- Tailwind CSS
- shadcn/ui
- RPGUI / custom UI

Responsibilities:

- User interface
- Navigation
- Client-side state
- Forms
- User interaction
- API consumption

The UI never connects directly to MongoDB.

---

## Save State API

The backend of the Save State application.

Technology:

- Node.js
- Express
- TypeScript
- MongoDB
- Mongoose
- JWT

Responsibilities:

- Authentication
- Authorization
- User management
- User game library
- Global game metadata persistence
- UserGame relationships
- Game lists
- Game/list relationships
- Filtering
- Pagination
- Search
- Game statistics
- Business rules
- Communication with ATP Engine

The API is the only Save State component that directly accesses the application's MongoDB database.

---

## ATP Engine

Independent metadata discovery and enrichment service.

Responsibilities:

- Game search
- Metadata discovery
- Cover search
- Provider integration
- Result normalization
- Deduplication
- Ranking

The ATP Engine does not own:

- Users
- Authentication
- UserGames
- GameLists
- User permissions

The ATP Engine may eventually be implemented in Java/Spring Boot.

The Save State application must remain functional even if ATP is unavailable.

---

# Core Domain

The core entities are:

- User
- GlobalGame
- UserGame
- GameList

The relationship is:

    User
      |
      +------ UserGame ------> GlobalGame
      |            |
      |            +---------> GameList[]
      |
      +------ GameList


## GlobalGame

Represents the game itself and its global/shared metadata.

Examples:

- name
- cover
- genres
- platforms
- developers
- publishers
- release date
- summary
- metadata source

GlobalGame is not owned by a user.

---

## UserGame

Represents a user's relationship with a GlobalGame.

It contains personal data such as:

- status
- hours played
- times finished
- personal rating
- review
- list membership

Two users can have UserGame records referring to the same GlobalGame.

---

## GameList

A GameList is a label/tag.

It is NOT a container.

Therefore:

- A list may contain zero games.
- A game may belong to zero lists.
- A game may belong to multiple lists.
- Deleting a list does not delete games.
- Deleting a game does not delete lists.

---

# Manual Games

The user may create games manually.

This is required for games such as:

- ROM hacks
- obscure games
- Japanese-only releases
- RPG Maker games
- fan games
- prototypes
- games unavailable from public databases

Manual creation does not require ATP.

The manual creation flow is:

    User
      |
      v
    Save State API
      |
      +--> create GlobalGame(source="manual")
      |
      +--> create UserGame
      |
      v
    MongoDB

ATP enrichment is optional.

---

# Authentication

The API uses JWT authentication.

The expected authentication flow is:

    Login
      |
      v
    credentials validated
      |
      v
    JWT generated
      |
      v
    HTTP-only cookie
      |
      v
    authenticated requests

User identity must always be derived from the verified JWT.

Client-provided user IDs must never be trusted for ownership.

---

# User Isolation

Every user-owned resource must be scoped to the authenticated user.

A user must never be able to:

- read another user's games;
- modify another user's games;
- delete another user's games;
- read another user's lists;
- modify another user's lists;
- delete another user's lists;
- associate a game with another user's list.

Ownership is a mandatory security rule.

---

# API Principles

The API must provide:

- pagination on collection GET endpoints;
- case-insensitive partial name search;
- explicit HTTP status codes;
- explicit human-readable error messages;
- predictable error response structures;
- user ownership validation;
- reusable filtering/query logic;
- statistics based on the same game filters used by the library.

---

# GET Games

Collection endpoint:

    GET /api/games

Supports:

- pagination;
- name search;
- list filtering;
- genre filtering;
- platform filtering;
- developer filtering;
- publisher filtering;
- release-date filtering;
- minimum/maximum hours played;
- minimum/maximum times finished;
- minimum/maximum personal rating.

Example:

    GET /api/games?search=zelda&page=1&limit=20

Search is case-insensitive and partial.

"zelda" must return results such as:

- The Legend of Zelda
- Zelda II: The Adventure of Link
- The Legend of Zelda: Ocarina of Time
- Hyrule Warriors

provided those games exist in the authenticated user's library.

---

# GET Game Lists

Collection endpoint:

    GET /api/game-lists

Supports:

- pagination;
- case-insensitive partial name search;
- optional game count.

Example:

    GET /api/game-lists?search=rpg&page=1&limit=20&withCount=true

---

# Game Statistics

The same filters used by the game listing must be reusable by the statistics layer.

The system should be capable of answering questions such as:

- How many RPGs does the user have?
- How many games on PS2?
- Average personal rating for a filtered collection.
- Total hours played for a filtered collection.
- Total times finished.
- Number of completed games.
- Distribution by genre.
- Distribution by platform.
- Distribution by developer.
- Distribution by publisher.
- Release-year distribution.

The dashboard must not implement its own independent filtering rules.

The dashboard and game listing must use the same query/filter semantics.

---

# Development Priority

The project should be implemented in this order:

1. Project setup
2. MongoDB connection
3. User model
4. Authentication
5. Authorization
6. GlobalGame model
7. UserGame model
8. GameList model
9. Game CRUD
10. GameList CRUD
11. Game/list relationships
12. Search
13. Pagination
14. Filters
15. Game statistics
16. Error handling
17. Frontend integration
18. Tests
19. ATP integration

The ATP Engine must not block completion of the core API.