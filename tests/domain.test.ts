import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import {
  getApp,
  login,
  register,
  startMongo,
  stopMongo,
  userA,
} from "./helpers";

let agent: request.Agent;

beforeAll(async () => {
  await startMongo();
  await register(userA);
  agent = request.agent(getApp());
  await agent.post("/api/auth/login").send({
    email: userA.email,
    password: userA.password,
  });
});

afterAll(stopMongo);

async function createGame(name = "Domain Game") {
  const res = await agent
    .post("/api/games")
    .send({ game: { name } });
  return res.body.data;
}

describe("Domain", () => {
  let gameId: string;
  let listId: string;

  it("creates a manual GlobalGame with source=manual and a UserGame", async () => {
    const data = await createGame();
    gameId = data._id;
    expect(data.game.source).toBe("manual");
    expect(data.gameId).toBeDefined();
    expect(data.status).toBe("backlog");
  });

  it("rejects creating the same game twice", async () => {
    const res = await agent.post("/api/games").send({
      game: { name: "Domain Game" },
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("GAME_ALREADY_IN_LIBRARY");
  });

  it("an empty list is valid", async () => {
    const res = await agent.post("/api/game-lists").send({ name: "Empty" });
    expect(res.status).toBe(201);
    listId = res.body.data._id;
    const countRes = await agent.get("/api/game-lists?withCount=true");
    const emptyList = countRes.body.data.find(
      (l: { _id: string }) => l._id === listId,
    );
    expect(emptyList.gameCount).toBe(0);
  });

  it("a game can belong to no lists", async () => {
    const data = await createGame("No List Game");
    expect(data.listIds).toEqual([]);
  });

  it("a game can belong to multiple lists", async () => {
    const other = await agent
      .post("/api/game-lists")
      .send({ name: "Second" });
    const secondId = other.body.data._id;

    await agent.post(`/api/games/${gameId}/lists/${listId}`);
    await agent.post(`/api/games/${gameId}/lists/${secondId}`);

    const res = await agent.get(`/api/games/${gameId}`);
    expect(res.body.data.listIds).toHaveLength(2);
  });

  it("adding the same list twice is idempotent", async () => {
    await agent.post(`/api/games/${gameId}/lists/${listId}`);
    const res = await agent.get(`/api/games/${gameId}`);
    expect(res.body.data.listIds).toHaveLength(2);
  });

  it("removing a list from a game keeps the UserGame and GameList", async () => {
    await agent.delete(`/api/games/${gameId}/lists/${listId}`);
    const gameRes = await agent.get(`/api/games/${gameId}`);
    expect(gameRes.status).toBe(200);
    const listRes = await agent.get(`/api/game-lists/${listId}`);
    expect(listRes.status).toBe(200);
  });

  it("deleting a list removes only the label, not games or global metadata", async () => {
    const delRes = await agent.delete(`/api/game-lists/${listId}`);
    expect(delRes.status).toBe(204);

    const gameRes = await agent.get(`/api/games/${gameId}`);
    expect(gameRes.status).toBe(200);
    expect(
      gameRes.body.data.listIds.map((id: string) => String(id)),
    ).not.toContain(listId);
  });

  it("deleting a game keeps the GlobalGame", async () => {
    const delRes = await agent.delete(`/api/games/${gameId}`);
    expect(delRes.status).toBe(204);
    const mine = await agent.get("/api/games");
    expect(
      mine.body.data.some((g: { _id: string }) => g._id === gameId),
    ).toBe(false);
    expect(mine.body.pagination.total).toBeGreaterThanOrEqual(1);
  });

  it("updating personal fields does not overwrite shared metadata", async () => {
    const created = await createGame("Shared Check");
    await agent.patch(`/api/games/${created._id}`).send({ rating: 3 });
    const res = await agent.get(`/api/games/${created._id}`);
    expect(res.body.data.rating).toBe(3);
    expect(res.body.data.game.name).toBe("Shared Check");
    expect(res.body.data.game.source).toBe("manual");
  });
});
