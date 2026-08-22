# Save State API — Authentication and Security

## 1. Authentication

Save State uses JWT-based authentication.

The current system stores the JWT in an HTTP-only cookie.

The backend is responsible for issuing and verifying the token.

---

# 2. Register

    POST /api/auth/register


Input:

    {
      "name": "User",
      "email": "user@example.com",
      "password": "password"
    }


The API must:

1. Validate input.
2. Verify email uniqueness.
3. Hash password.
4. Create User.
5. Return safe user information.

The password must never be returned.

---

# 3. Login

    POST /api/auth/login


Flow:

    credentials
       |
       v
    find User
       |
       v
    verify password
       |
       v
    generate JWT
       |
       v
    HTTP-only cookie


Invalid credentials must not reveal whether the email exists.

---

# 4. JWT

The JWT must contain only the minimal information required to establish identity.

Recommended conceptual payload:

    {
      "userId": "..."
    }


JWT secret must come from environment configuration.

Example:

    JWT_SECRET=...


JWT expiration must be configured.

---

# 5. Cookie

The authentication cookie should use:

    httpOnly
    sameSite
    path


In production it should also use:

    secure


Exact cookie configuration may depend on deployment topology.

---

# 6. Current User

    GET /api/auth/me


Returns the authenticated user representation.

The frontend must not submit a user ID to determine which user is being queried.

The JWT determines identity.

---

# 7. Logout

    POST /api/logout


Clears the authentication cookie.

Logout should be safe to call repeatedly.

---

# 8. Password Storage

Passwords must be hashed.

The API currently uses bcrypt-compatible hashing.

Passwords must never be:

- stored as plaintext;
- logged;
- included in JWT;
- returned by API;
- persisted in frontend state.

---

# 9. Authorization

Authorization is mandatory for all user-owned resources.

Authentication answers:

    Who are you?


Authorization answers:

    Are you allowed to access this resource?


Both are required.

---

# 10. User Ownership

User-owned entities:

- UserGame
- GameList

The API must verify ownership on every operation.

---

# 11. Game Authorization

Every UserGame operation must conceptually include:

    userId = authenticatedUserId


Examples:

    find game
    update game
    delete game
    add list
    remove list


The implementation must never rely solely on gameId.

---

# 12. List Authorization

Every GameList operation must conceptually include:

    userId = authenticatedUserId


Example:

    GameList.findOne({
      _id: listId,
      userId: authenticatedUserId
    })


---

# 13. Cross-User Relationship Authorization

To add Game A to List B, both must belong to the authenticated user.

Required:

    UserGame.userId === authenticatedUserId

    GameList.userId === authenticatedUserId


If either fails, the operation must be rejected.

---

# 14. Client-Supplied User IDs

Never trust:

    req.body.userId
    req.query.userId
    req.params.userId


for authorization.

The user ID comes from the verified JWT.

---

# 15. Object IDs

Route parameters representing MongoDB ObjectIds must be validated.

Example:

    /games/:gameId


An invalid ObjectId should generate an explicit client error rather than an uncontrolled MongoDB exception.

---

# 16. Request Validation

All external input must be validated.

Validation applies to:

- authentication;
- game creation;
- game updates;
- list creation;
- list updates;
- pagination;
- search;
- filters;
- IDs.

---

# 17. Query Validation

Examples of invalid input:

    page = -1
    limit = 0
    limit = 999999
    ratingMin > ratingMax
    hoursPlayedMin > hoursPlayedMax
    invalid release date
    invalid ObjectId


The API must return an explicit HTTP 400 response.

---

# 18. Error Messages

Errors must have:

- HTTP status;
- stable error code;
- human-readable message.

Example:

    {
      "error": {
        "code": "INVALID_RATING_RANGE",
        "message": "ratingMin cannot be greater than ratingMax"
      }
    }


---

# 19. Sensitive Information

Never expose:

- passwordHash;
- JWT secrets;
- database credentials;
- authentication cookies;
- internal stack traces;
- private data belonging to another user.

---

# 20. GlobalGame Security

GlobalGame is shared data.

The API must carefully distinguish:

    personal modification

from:

    global modification


A user's personal rating, review, list membership, hours played, and times finished must never modify GlobalGame.

---

# 21. Manual Game Security

A user may create a manual GlobalGame for their own UserGame.

The API must not allow that operation to attach to or overwrite an unrelated user's private data.

---

# 22. Security Principle

The frontend is untrusted.

All values received over HTTP must be treated as untrusted until validated and authorized.