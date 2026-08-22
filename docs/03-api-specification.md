# Save State API — API Specification

## 1. Base API

All API routes use:

    /api


Authentication:

    /api/auth


Games:

    /api/games


Lists:

    /api/game-lists

---

# 2. Authentication Routes

    POST /api/auth/register
    POST /api/auth/login
    GET  /api/auth/me
    POST /api/logout

---

# 3. Game Routes

    GET    /api/games
    POST   /api/games
    GET    /api/games/:gameId
    PATCH  /api/games/:gameId
    DELETE /api/games/:gameId


Relationship:

    POST   /api/games/:gameId/lists/:listId
    DELETE /api/games/:gameId/lists/:listId


Game statistics:

    GET /api/games/stats

---

# 4. Game List Routes

    GET    /api/game-lists
    POST   /api/game-lists
    GET    /api/game-lists/:listId
    PATCH  /api/game-lists/:listId
    DELETE /api/game-lists/:listId

Games inside list:

    GET /api/game-lists/:listId/games


---

# 5. Authentication Requirement

All game and GameList routes require an authenticated user.

The authenticated user is determined from JWT authentication.

---

# 6. GET /api/games

Returns the authenticated user's games.

This is a collection endpoint and must support pagination.

Required query parameters:

    page
    limit

Optional query parameters:

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


Example:

    GET /api/games
      ?search=zelda
      &page=1
      &limit=20
      &platform=PS2
      &ratingMin=7


---

# 7. Game Search

The `search` parameter searches by game name.

Search is:

- case-insensitive;
- partial;
- based on name equivalence/containment.

Example:

    search=zelda


must return all matching games in the authenticated user's library whose name contains "zelda", regardless of case.

Examples of matching titles:

    The Legend of Zelda
    Zelda II: The Adventure of Link
    The Legend of Zelda: Ocarina of Time


The API must not limit the search to exact equality.

---

# 8. Game Filters

## Name

    search


Searches GlobalGame.name.

---

## List

    listId


Returns only games whose UserGame.listIds contains the specified list.

The list must belong to the authenticated user.

---

## Genre

    genre


Filters by GlobalGame genre.

Matching behavior must be defined consistently for string/array metadata.

---

## Platform

    platform


Filters by GlobalGame platform.

---

## Developer

    developer


Filters by GlobalGame developer.

---

## Publisher

    publisher


Filters by GlobalGame publisher.

---

## Release Date

    releaseDateFrom
    releaseDateTo


Filters GlobalGame.release_date by range.

The API must normalize dates consistently before comparison.

---

## Hours Played

    hoursPlayedMin
    hoursPlayedMax


Filters:

    UserGame.hours_played


---

## Times Finished

    timesFinishedMin
    timesFinishedMax


Filters:

    UserGame.times_finished


---

## Personal Rating

    ratingMin
    ratingMax


Filters:

    UserGame.rating


---

# 9. Pagination

Collection endpoints must support pagination.

Parameters:

    page
    limit


Example:

    page=1
    limit=20


The API should validate reasonable limits.

It should not allow unbounded requests.

Example response:

    {
      "data": [...],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 143,
        "totalPages": 8,
        "hasNextPage": true,
        "hasPreviousPage": false
      }
    }


The exact envelope can evolve, but the pagination contract must remain consistent.

---

# 10. GET /api/games/:gameId

Returns one game belonging to the authenticated user.

The endpoint does not require pagination because it returns one resource.

It must verify:

    UserGame.userId === authenticatedUser.id


---

# 11. POST /api/games

Creates a game for the authenticated user.

The endpoint must support:

- manually supplied metadata;
- an existing GlobalGame;
- ATP-enriched metadata.

When creating a new game manually:

    create GlobalGame
      source = "manual"

    then create UserGame


The user's ownership is derived from authentication.

The client must not supply the authoritative userId.

---

# 12. PATCH /api/games/:gameId

Updates the authenticated user's UserGame and explicitly supported personal/global fields.

The implementation must not accidentally overwrite shared GlobalGame data with personal data.

Updates to GlobalGame must have an explicit policy.

---

# 13. DELETE /api/games/:gameId

Deletes the authenticated user's UserGame.

It does not delete GlobalGame.

---

# 14. POST /api/games/:gameId/lists/:listId

Adds a list label to a user's game.

Required validation:

1. UserGame belongs to authenticated user.
2. GameList belongs to authenticated user.
3. The relationship does not already exist.

The operation should be idempotent.

---

# 15. DELETE /api/games/:gameId/lists/:listId

Removes the list label from the UserGame.

It does not delete:

- UserGame;
- GameList;
- GlobalGame.

---

# 16. GET /api/game-lists

Returns GameLists belonging to the authenticated user.

Supports:

    page
    limit
    search
    withCount


Example:

    GET /api/game-lists
      ?search=rpg
      &page=1
      &limit=20
      &withCount=true


---

# 17. Game List Search

The `search` parameter searches list name.

Search is:

- case-insensitive;
- partial.

Example:

    search=rpg


may return:

    RPG
    RPG Favorites
    RPGs to Play
    Best RPGs


---

# 18. GET /api/game-lists/:listId

Returns one GameList belonging to the authenticated user.

The endpoint must not reveal another user's list.

---

# 19. POST /api/game-lists

Creates a GameList.

A newly created list is allowed to contain zero games.

Example:

    {
      "name": "Backlog"
    }


The authenticated user becomes its owner.

---

# 20. PATCH /api/game-lists/:listId

Updates list data, primarily the name.

The list must belong to the authenticated user.

---

# 21. DELETE /api/game-lists/:listId

Deletes the user's list.

The operation must:

1. Delete GameList.
2. Remove list ID from UserGame.listIds for the same user.
3. Preserve all UserGame records.
4. Preserve all GlobalGame records.

---

# 22. GET /api/game-lists/:listId/games

Returns games associated with the authenticated user's list.

Supports:

    page
    limit
    search
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


This endpoint must use the same filtering semantics as GET /api/games.

---

# 23. GET /api/games/stats

Returns statistical information about the authenticated user's games.

It accepts the same game filters as:

    GET /api/games


Example:

    GET /api/games/stats
      ?platform=PS2
      &genre=RPG
      &ratingMin=7


The filters determine the population being analyzed.

---

# 24. Statistics

The statistics layer should support, as applicable:

- total games;
- total hours played;
- total times finished;
- average rating;
- minimum rating;
- maximum rating;
- average hours played;
- average times finished;
- distribution by genre;
- distribution by platform;
- distribution by developer;
- distribution by publisher;
- distribution by release year;
- distribution by status.

The exact response shape may evolve.

---

# 25. Dashboard Principle

The dashboard must use the same query/filter object as the game listing.

Example:

    GameQuery

is applied consistently to:

    GET /games

and:

    GET /games/stats


A user filtering:

    Platform = PS2
    Genre = RPG
    Rating >= 8


must see both:

- the matching games;
- statistics calculated from those same games.

The dashboard must never calculate statistics from a different dataset than the visible game filter.

---

# 26. GET Error Handling

Every collection GET endpoint must explicitly handle failures.

Examples:

    invalid query
    invalid pagination
    invalid ObjectId
    database failure
    unexpected server error


Example:

    HTTP 400

    {
      "error": {
        "code": "INVALID_QUERY",
        "message": "limit must be between 1 and 100"
      }
    }


Example:

    HTTP 401

    {
      "error": {
        "code": "UNAUTHENTICATED",
        "message": "Authentication is required"
      }
    }


Example:

    HTTP 404

    {
      "error": {
        "code": "LIST_NOT_FOUND",
        "message": "Game list not found"
      }
    }


Example:

    HTTP 500

    {
      "error": {
        "code": "GAMES_QUERY_FAILED",
        "message": "Unable to load games"
      }
    }


Messages must be explicit enough to help diagnose the request failure without exposing internal implementation details.

---

# 27. Resource Ownership Errors

The API must avoid leaking another user's data.

If a resource does not belong to the authenticated user, the API should return a response consistent with the resource-not-found security strategy rather than revealing private information.

---

# 28. Empty Results

A successful query that finds no records is not an error.

Example:

    GET /api/games?search=nonexistent


returns an empty collection with HTTP 200.

Example:

    {
      "data": [],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 0,
        "totalPages": 0,
        "hasNextPage": false,
        "hasPreviousPage": false
      }
    }