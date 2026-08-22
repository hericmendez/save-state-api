import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import {
  getApp,
  login,
  register,
  startMongo,
  stopMongo,
  userA,
  userB,
} from "./helpers";

let agentA: request.Agent;
let agentB: request.Agent;

beforeAll(async () => {
  await startMongo();
  await register(userA);
  await register(userB);
  agentA = request.agent(getApp());
  agentB = request.agent(getApp());
  await agentA.post("/api/auth/login").send({
    email: userA.email,
    password: userA.password,
  });
  await agentB.post("/api/auth/login").send({
    email: userB.email,
    password: userB.password,
  });
});

afterAll(stopMongo);

async function createGame(agent: request.Agent, name = "Owned Game") {
  const res = await agent.post("/api/games").send({
    game: { name },
  });
  return res.body.data._id as string;
}

async function createList(agent: request.Agent, name: string) {
  const res = await agent.post("/api/game-lists").send({ name });
  return res.body.data._id as string;
}

describe("Ownership", () => {
  let gameIdA: string;
  let listIdA: string;
  let gameIdB: string;
  let listIdB: string;

  beforeAll(async () => {
    gameIdA = await createGame(agentA, "Game of A");
    listIdA = await createList(agentA, "List of A");
    gameIdB = await createGame(agentB, "Game of B");
    listIdB = await createList(agentB, "List of B");
  });

  it("user A cannot read game of B", async () => {
    expect((await agentA.get(`/api/games/${gameIdB}`)).status).toBe(404);
  });

  it("user A cannot update game of B", async () => {
    const res = await agentA
      .patch(`/api/games/${gameIdB}`)
      .send({ rating: 1 });
    expect(res.status).toBe(404);
  });

  it("user A cannot delete game of B", async () => {
    const res = await agentA.delete(`/api/games/${gameIdB}`);
    expect(res.status).toBe(404);
    const check = await agentB.get(`/api/games/${gameIdB}`);
    expect(check.status).toBe(200);
  });

  it("user A cannot read list of B", async () => {
    expect((await agentA.get(`/api/game-lists/${listIdB}`)).status).toBe(404);
  });

  it("user A cannot update list of B", async () => {
    const res = await agentA
      .patch(`/api/game-lists/${listIdB}`)
      .send({ name: "Hacked" });
    expect(res.status).toBe(404);
  });

  it("user A cannot delete list of B", async () => {
    const res = await agentA.delete(`/api/game-lists/${listIdB}`);
    expect(res.status).toBe(404);
    const check = await agentB.get(`/api/game-lists/${listIdB}`);
    expect(check.status).toBe(200);
  });

  it("user A cannot add own game to list of B", async () => {
    const res = await agentA.post(
      `/api/games/${gameIdA}/lists/${listIdB}`,
    );
    expect([400, 404]).toContain(res.status);
  });

  it("user A cannot add game of B to own list", async () => {
    const res = await agentA.post(
      `/api/games/${gameIdB}/lists/${listIdA}`,
    );
    expect(res.status).toBe(404);
  });

  it("games listing only shows own games", async () => {
    const res = await agentA.get("/api/games");
    const names = res.body.data.map(
      (g: { game: { name: string } }) => g.game.name,
    );
    expect(names).toContain("Game of A");
    expect(names).not.toContain("Game of B");
  });

  it("stats only considers own games", async () => {
    const resA = await agentA.get("/api/games/stats");
    expect(resA.body.data.byStatus.backlog).toBe(1);
    const resB = await agentB.get("/api/games/stats");
    expect(resB.body.data.totalGames).toBe(1);
  });
});
