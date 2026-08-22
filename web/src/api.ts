export interface SafeUser {
  _id: string;
  name: string;
  email: string;
}

export interface Game {
  _id: string;
  status?: string;
  hoursPlayed?: number | null;
  timesFinished?: number | null;
  rating?: number | null;
  review?: string | null;
  listIds?: string[];
  game: {
    _id?: string;
    name: string;
    genres?: string[];
    platforms?: string[];
  } | null;
}

export interface GameList {
  _id: string;
  name: string;
  gameCount?: number;
}

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers:
      init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });

  if (res.status === 204) return undefined as T;

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      (json as { error?: { code?: string; message?: string } })?.error?.message ??
      `HTTP ${res.status}`;
    throw new ApiRequestError(res.status, message);
  }

  return (json as { data: T }).data ?? (json as unknown as T);
}

export const api = {
  register: (name: string, email: string, password: string) =>
    request<SafeUser>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),
  login: (email: string, password: string) =>
    request<SafeUser>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<SafeUser>("/api/auth/me"),
  logout: () => request<{ message: string }>("/api/logout", { method: "POST" }),

  // Games
  listGames: (listId?: string) =>
    request<Game[]>(`/api/games?limit=100${listId ? `&listId=${listId}` : ""}`),
  getGame: (id: string) => request<Game>(`/api/games/${id}`),
  createGame: (payload: Record<string, unknown>) =>
    request<Game>("/api/games", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateGame: (id: string, payload: Record<string, unknown>) =>
    request<Game>(`/api/games/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteGame: (id: string) =>
    request<void>(`/api/games/${id}`, { method: "DELETE" }),

  // Lists
  listLists: () => request<GameList[]>("/api/game-lists?limit=100&withCount=true"),
  createList: (name: string) =>
    request<GameList>("/api/game-lists", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  renameList: (listId: string, name: string) =>
    request<GameList>(`/api/game-lists/${listId}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  deleteList: (listId: string) =>
    request<void>(`/api/game-lists/${listId}`, { method: "DELETE" }),

  // List ↔ game membership
  addGameToList: (gameId: string, listId: string) =>
    request<void>(`/api/games/${gameId}/lists/${listId}`, { method: "POST" }),
  removeGameFromList: (gameId: string, listId: string) =>
    request<void>(`/api/games/${gameId}/lists/${listId}`, { method: "DELETE" }),
};
