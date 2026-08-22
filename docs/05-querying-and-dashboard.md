# Save State API — Querying and Dashboard

## 1. Purpose

Game querying is a first-class part of the Save State API.

The same query semantics must power:

- game lists;
- filtered library views;
- list-specific game views;
- dashboard statistics.

The goal is to avoid having separate filtering logic for each feature.

---

# 2. Canonical Game Query

The canonical query object is:

    GameQuery

Example:

    {
      page,
      limit,
      search,
      listId,
      genre,
      platform,
      developer,
      publisher,
      releaseDateFrom,
      releaseDateTo,
      hoursPlayedMin,
      hoursPlayedMax,
      timesFinishedMin,
      timesFinishedMax,
      ratingMin,
      ratingMax
    }


---

# 3. Pagination

Defaults should be defined centrally.

Example:

    page = 1
    limit = 20


Maximum limit should be enforced.

Example:

    maxLimit = 100


The exact default values may evolve.

---

# 4. Search

Game search uses:

    search


It performs case-insensitive partial name matching.

Example:

    search=zelda


matches:

    The Legend of Zelda
    Zelda II
    The Legend of Zelda: Twilight Princess


The search applies to the authenticated user's library.

---

# 5. List Filter

Parameter:

    listId


Only UserGames containing that list ID are returned.

The list must belong to the authenticated user.

---

# 6. Genre Filter

Parameter:

    genre


Matches GlobalGame genre metadata.

Because metadata may contain multiple genres, the implementation must support multi-valued game metadata correctly.

---

# 7. Platform Filter

Parameter:

    platform


Matches GlobalGame platform metadata.

---

# 8. Developer Filter

Parameter:

    developer


Matches GlobalGame developer metadata.

---

# 9. Publisher Filter

Parameter:

    publisher


Matches GlobalGame publisher metadata.

---

# 10. Release Date Filter

Parameters:

    releaseDateFrom
    releaseDateTo


The API must normalize date representation consistently.

The current schema stores release_date as a string, so the final implementation should establish a safe and consistent comparison strategy.

Migration to a true date type may be considered later.

---

# 11. Hours Played Filter

Parameters:

    hoursPlayedMin
    hoursPlayedMax


These apply to:

    UserGame.hours_played


Example:

    hoursPlayedMin=20


returns games with at least 20 hours played.

---

# 12. Times Finished Filter

Parameters:

    timesFinishedMin
    timesFinishedMax


These apply to:

    UserGame.times_finished


---

# 13. Personal Rating Filter

Parameters:

    ratingMin
    ratingMax


These apply to:

    UserGame.rating


---

# 14. Combined Filters

Filters are composable.

Example:

    GET /api/games
      ?search=zelda
      &genre=RPG
      &platform=PS2
      &ratingMin=8
      &hoursPlayedMin=20


The result must satisfy all supplied filters.

Conceptually:

    search
      AND genre
      AND platform
      AND rating
      AND hours


---

# 15. Sorting

The API may support sorting as an extension to filtering.

Possible fields:

    name
    release_date
    hours_played
    times_finished
    rating
    createdAt


Possible direction:

    asc
    desc


Example:

    sortBy=hoursPlayed
    sortOrder=desc


Sorting should be centralized rather than separately implemented by each endpoint.

---

# 16. List Queries

GameList query:

    ListQuery
    {
      page,
      limit,
      search
    }


Search applies to:

    GameList.name


---

# 17. Game List Counts

If supported:

    withCount=true


The count represents the number of UserGames belonging to the list for the authenticated user.

A count is derived information.

It should not become a second authoritative relationship.

---

# 18. Statistics Query

Statistics use:

    GameQuery


Example:

    GET /api/games/stats
      ?genre=RPG
      &platform=PS2
      &ratingMin=8


The statistics service must analyze exactly the filtered game population represented by the query.

---

# 19. Dashboard

The dashboard should be able to consume statistics for the current filtered collection.

Possible metrics:

    totalGames
    totalHoursPlayed
    totalTimesFinished
    averageRating
    averageHoursPlayed
    averageTimesFinished


Possible distributions:

    byStatus
    byGenre
    byPlatform
    byDeveloper
    byPublisher
    byReleaseYear
    byRating


---

# 20. Dashboard Consistency

The following user action:

    Filter:
      Genre = RPG
      Platform = PS2
      Rating >= 8


must produce:

    Game list
    +
    statistics


from the same filtered dataset.

The UI must not independently calculate the statistics from whatever happens to be loaded on screen.

---

# 21. Query Service

A shared query service should be responsible for interpreting GameQuery.

Conceptual architecture:

    HTTP query parameters
            |
            v
       Query validator
            |
            v
       GameQuery object
            |
       +----+----+
       |         |
       v         v
    Game list  Statistics
       |         |
       +----+----+
            |
            v
       same semantics


---

# 22. Query Performance

The API should avoid loading the entire user's game collection into application memory for ordinary filtered listing.

Filtering, pagination, sorting, and aggregation should be delegated to MongoDB whenever practical.

The old implementation calculates list counts by loading all games and filtering them in application memory.

That approach should not be considered the target architecture.

---

# 23. Empty Search Results

No matching games is a successful query.

Example:

    HTTP 200

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


---

# 24. Query Errors

Invalid query parameters must return HTTP 400.

Database/query execution failures must return an appropriate HTTP 500-class response.

Messages must explicitly describe the failure without exposing internals.