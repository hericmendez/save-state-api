# Save State API — Domain Model

## 1. Core Entities

The core domain consists of:

- User
- GlobalGame
- UserGame
- GameList

---

# 2. User

Represents an authenticated Save State account.

Conceptual fields:

    User
    ├── _id
    ├── name
    ├── email
    ├── passwordHash
    ├── createdAt
    └── updatedAt


Password must never be stored in plaintext.

---

# 3. GlobalGame

Represents shared metadata about a game.

Conceptual fields:

    GlobalGame
    ├── _id
    ├── slug
    ├── name
    ├── source
    ├── source_url
    ├── cover
    ├── genres
    ├── platforms
    ├── developers
    ├── publishers
    ├── release_date
    ├── summary
    ├── createdAt
    └── updatedAt


GlobalGame is not owned by a user.

---

# 4. Metadata Source

A GlobalGame may originate from:

- ATP;
- manual entry;
- another future trusted source.

The source must be represented explicitly when possible.

For manual games:

    source = "manual"


ATP discovery is not required to create a valid GlobalGame.

---

# 5. GlobalGame Coverage

GlobalGame represents information about the game itself.

Examples:

- title;
- cover;
- genres;
- platforms;
- developers;
- publishers;
- release date;
- summary;
- external source information.

GlobalGame should not contain personal user information.

---

# 6. UserGame

Represents a specific user's relationship with a GlobalGame.

Conceptual fields:

    UserGame
    ├── _id
    ├── userId
    ├── gameId -> GlobalGame
    ├── status
    ├── hours_played
    ├── times_finished
    ├── rating
    ├── review
    ├── listIds[]
    ├── createdAt
    └── updatedAt


---

# 7. UserGame Ownership

Every UserGame belongs to exactly one User.

A UserGame must never be publicly readable by another user.

---

# 8. UserGame Personal Data

The following are personal/user-specific values:

- status;
- hours played;
- times finished;
- personal rating;
- review;
- list membership.

These values must remain independent from GlobalGame.

---

# 9. Global vs Personal Rating

GlobalGame metadata may eventually contain a global/aggregated rating if such a field is explicitly defined.

UserGame.rating is the user's personal rating.

They are not interchangeable.

A user's personal rating must never overwrite shared global game metadata.

---

# 10. GameList

GameList represents a user-created label/tag.

Conceptual fields:

    GameList
    ├── _id
    ├── userId
    ├── name
    ├── createdAt
    └── updatedAt


---

# 11. Lists Are Labels

A GameList is NOT a container.

It has independent existence.

Valid states include:

    Backlog -> 0 games

    RPG -> 20 games

    Favorites -> 5 games

    Personal -> 0 games


---

# 12. UserGame/List Relationship

The current relationship is represented through:

    UserGame.listIds[]


Each ID refers to a GameList belonging to the same user.

A UserGame may have:

    listIds: []


This means the user owns the game but has not labeled it.

---

# 13. Multiple Lists

A UserGame may belong to multiple lists.

Example:

    listIds:
    [
      "BACKLOG",
      "RPG",
      "PS2"
    ]


This is valid.

---

# 14. Deleting a List

When a GameList is deleted:

1. Delete the GameList.
2. Remove its ID from UserGame.listIds for that user's games.
3. Keep UserGame records.
4. Keep GlobalGame records.
5. Do not delete other lists.

---

# 15. Deleting UserGame

Deleting a UserGame means the user no longer owns that game in their personal library.

It must not delete:

    GlobalGame


because GlobalGame may be used by other users.

---

# 16. Deleting GlobalGame

GlobalGame deletion is separate from UserGame deletion.

Deleting a UserGame must never automatically delete GlobalGame.

GlobalGame deletion requires explicit business rules because it may affect multiple users.

---

# 17. Manual Game Creation

A manual game is represented using the same domain structure as an ATP-discovered game.

Flow:

    user input
        |
        v
    GlobalGame
    source = "manual"
        |
        v
    UserGame
        |
        v
    user library


This means every UserGame still references a GlobalGame.

The user is not required to provide every possible metadata field.

Required metadata should remain minimal enough to support obscure/manual games.

---

# 18. ATP Game Creation

ATP flow:

    query
      |
      v
    ATP Engine
      |
      v
    metadata result
      |
      v
    Save State API
      |
      v
    GlobalGame
      |
      v
    UserGame


The API is responsible for persistence.

---

# 19. User Isolation

User-owned entities:

    UserGame
    GameList


Global/shared entity:

    GlobalGame


The same GlobalGame may be referenced by multiple users.

---

# 20. Domain Invariants

The following must always be true:

1. Every UserGame belongs to exactly one User.
2. Every UserGame references one GlobalGame.
3. Every GameList belongs to exactly one User.
4. A GameList may contain zero games.
5. A UserGame may belong to zero lists.
6. A UserGame may belong to multiple lists.
7. A UserGame may only reference lists owned by the same user.
8. Deleting a list does not delete UserGame.
9. Deleting a list does not delete GlobalGame.
10. Deleting a UserGame does not delete GlobalGame.
11. Manual games are valid.
12. ATP is optional.
13. GlobalGame is not user-owned.
14. User-specific metadata must remain separate from global metadata.