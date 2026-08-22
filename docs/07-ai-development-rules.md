# Save State API — AI Development Rules

## 1. Purpose

This document defines mandatory rules for AI-assisted development.

An AI agent working on Save State API must follow these rules unless a human explicitly overrides them.

---

# 2. Do Not Invent Domain Rules

Do not invent:

- entities;
- relationships;
- ownership rules;
- authentication behavior;
- metadata semantics;
- list semantics;
- ATP responsibilities.

When something is not defined by the documentation or existing code, identify the ambiguity before making a permanent architectural decision.

---

# 3. Respect Domain Boundaries

The system contains:

    Save State UI
    Save State API
    ATP Engine


Do not move responsibilities between these projects without an explicit reason.

---

# 4. Do Not Couple API to Frontend

The API must not know about:

- React components;
- Zustand;
- frontend routing;
- Tailwind;
- UI components.

The API exposes HTTP contracts.

---

# 5. Do Not Couple API to ATP Implementation

The API may call ATP over HTTP.

It must not import ATP's internal scraper/provider classes.

---

# 6. Authentication Rule

Never trust client-provided user IDs.

Always use authenticated identity.

Bad:

    req.body.userId

Good:

    req.user.id


---

# 7. Ownership Rule

Every user-owned database operation must enforce ownership.

Bad:

    UserGame.findById(gameId)


Good:

    UserGame.findOne({
      _id: gameId,
      userId: authenticatedUserId
    })


The exact query may vary, but the ownership guarantee must remain.

---

# 8. Game/List Ownership

When adding a game to a list, verify both sides.

Required:

    game belongs to current user

AND:

    list belongs to current user


Never assume that having one valid resource is enough.

---

# 9. GlobalGame Rule

Do not place personal information into GlobalGame.

Personal data belongs to UserGame.

Examples of personal information:

- rating;
- review;
- hours played;
- times finished;
- status;
- list membership.

---

# 10. List Rule

GameLists are labels.

Never implement lists as owned containers.

A list may have zero games.

A game may have zero lists.

A game may belong to multiple lists.

---

# 11. Delete List Rule

Deleting a GameList must:

- delete the list;
- remove its ID from UserGame.listIds;
- preserve UserGame;
- preserve GlobalGame.

---

# 12. Delete Game Rule

Deleting a UserGame must:

- remove the user's relationship;
- preserve GlobalGame;
- preserve unrelated GameLists.

---

# 13. Manual Game Rule

Never require ATP for creating a valid game.

If ATP cannot identify the game:

    allow manual creation.


Manual game flow:

    GlobalGame(source="manual")
        +
    UserGame


---

# 14. Query Rule

All game collection endpoints must support the canonical GameQuery semantics.

Do not create a different filter syntax for:

- dashboard;
- game library;
- list games.

Reuse the same query semantics.

---

# 15. Search Rule

Name search is case-insensitive and partial.

A query:

    search=zelda

must not become exact equality.

---

# 16. Pagination Rule

Collection GET endpoints must be paginated.

Do not return an unbounded number of user-owned games.

Validate page and limit.

---

# 17. Error Rule

GET routes must provide explicit HTTP error responses.

Do not return:

    200 + vague message


when the operation failed.

Use:

- appropriate HTTP status;
- stable error code;
- explicit message.

---

# 18. Statistics Rule

Statistics must be calculated from the same filtered dataset represented by the game query.

Never create independent dashboard filtering rules.

---

# 19. Avoid N+1 Queries

When implementing:

- game lists;
- list membership;
- statistics;
- dashboard data;

avoid unnecessary repeated database queries.

Prefer MongoDB filtering/aggregation and intentional queries.

---

# 20. Do Not Copy Legacy Bugs

The current Next.js implementation contains duplicated routes and legacy structures.

The AI must not copy them blindly.

Examples of legacy behavior that must not become the target architecture:

- duplicate route implementations;
- duplicate GameList schema definitions;
- Game.player_data.listIds as the long-term relationship source;
- loading all games into memory merely to count list membership.

---

# 21. Target Architecture Has Priority

Existing code is evidence of current behavior.

Documentation defines the target architecture.

When current implementation and target architecture differ, refactor intentionally rather than preserving accidental legacy behavior.

---

# 22. Minimal Changes

Do not introduce complex abstractions without a concrete need.

Prefer simple, readable TypeScript.

Do not add:

- unnecessary frameworks;
- unnecessary repositories;
- unnecessary event buses;
- unnecessary microservices;
- unnecessary caching;

unless there is a demonstrated requirement.

---

# 23. Preserve API Contracts

When changing internal implementation, preserve existing HTTP semantics where practical.

Frontend code should not need to care whether MongoDB was queried through:

- Next.js;
- Express;
- another backend framework.

---

# 24. Testing Requirements

Changes affecting:

- authentication;
- authorization;
- ownership;
- list membership;
- game deletion;
- list deletion;

must have corresponding tests.

Security regressions are high priority.

---

# 25. Before Major Refactors

Before performing a major refactor:

1. Identify current behavior.
2. Identify target behavior.
3. Identify data migration implications.
4. Identify API compatibility implications.
5. Implement incrementally.
6. Verify existing functionality.

Do not perform broad rewrites without understanding affected relationships.

---

# 26. ATP Development Rule

Do not start a Java/Spring Boot ATP rewrite while the core Save State API is still unstable.

ATP is the experimental area.

The core application takes priority.

---

# 27. Final Principle

When in doubt, prefer:

    explicit domain rules
        >
    security
        >
    data integrity
        >
    predictable API behavior
        >
    implementation convenience