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

  const games = [
    {
      game: {
        name: "The Legend of Zelda",
        genres: ["Action"],
        platforms: ["NES"],
        developers: ["Nintendo"],
        publishers: ["Nintendo"],
        releaseDate: "1986-02-21",
      },
      status: "finished" as const,
      hoursPlayed: 20,
      timesFinished: 2,
      rating: 9,
    },
    {
      game: {
        name: "Zelda II: The Adventure of Link",
        genres: ["RPG"],
        platforms: ["NES"],
        developers: ["Nintendo"],
        publishers: ["Nintendo"],
        releaseDate: "1987-01-14",
      },
      status: "dropped" as const,
      hoursPlayed: 3,
      timesFinished: 0,
      rating: 5,
    },
    {
      game: {
        name: "Final Fantasy VII",
        genres: ["RPG"],
        platforms: ["PS1"],
        developers: ["Squaresoft"],
        publishers: ["Sony"],
        releaseDate: "1997-01-31",
      },
      status: "playing" as const,
      hoursPlayed: 50,
      timesFinished: 0,
      rating: 8,
    },
  ];

  for (const g of games) {
    await agent.post("/api/games").send(g);
  }
});

afterAll(stopMongo);

describe("Queries", () => {
  it("paginates results with correct metadata", async () => {
    const res = await agent.get("/api/games?page=1&limit=2");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination).toEqual({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
      hasNextPage: true,
      hasPreviousPage: false,
    });
  });

  it("search is partial and case-insensitive", async () => {
    const res = await agent.get("/api/games?search=zelda");
    expect(res.body.pagination.total).toBe(2);
    const names = res.body.data.map(
      (g: { game: { name: string } }) => g.game.name,
    );
    expect(names).toContain("The Legend of Zelda");
    expect(names).toContain("Zelda II: The Adventure of Link");
  });

  it("filters by genre, platform, developer and publisher", async () => {
    const genre = await agent.get("/api/games?genre=rpg");
    expect(genre.body.pagination.total).toBe(2);

    const platform = await agent.get("/api/games?platform=NES");
    expect(platform.body.pagination.total).toBe(2);

    const developer = await agent.get("/api/games?developer=squaresoft");
    expect(developer.body.pagination.total).toBe(1);

    const publisher = await agent.get("/api/games?publisher=sony");
    expect(publisher.body.pagination.total).toBe(1);
  });

  it("filters by release date range", async () => {
    const res = await agent.get(
      "/api/games?releaseDateFrom=1986-01-01&releaseDateTo=1986-12-31",
    );
    expect(res.body.pagination.total).toBe(1);
    expect(res.body.data[0].game.name).toBe("The Legend of Zelda");
  });

  it("filters by hours played range", async () => {
    const res = await agent.get("/api/games?hoursPlayedMin=10");
    expect(res.body.pagination.total).toBe(2);
  });

  it("filters by times finished range", async () => {
    const res = await agent.get("/api/games?timesFinishedMin=1");
    expect(res.body.pagination.total).toBe(1);
  });

  it("filters by rating range", async () => {
    const res = await agent.get("/api/games?ratingMin=7&ratingMax=9");
    expect(res.body.pagination.total).toBe(2);
  });

  it("combines filters with AND semantics", async () => {
    const res = await agent.get("/api/games?genre=RPG&platform=PS1&ratingMin=7");
    expect(res.body.pagination.total).toBe(1);
    expect(res.body.data[0].game.name).toBe("Final Fantasy VII");
  });

  it("rejects invalid query values with 400", async () => {
    const tooHighLimit = await agent.get("/api/games?limit=1000");
    expect(tooHighLimit.status).toBe(400);

    const badPage = await agent.get("/api/games?page=0");
    expect(badPage.status).toBe(400);

    const badDate = await agent.get("/api/games?releaseDateFrom=nonsense");
    expect(badDate.status).toBe(400);

    const badRating = await agent.get("/api/games?ratingMin=99");
    expect(badRating.status).toBe(400);
  });

  it("returns 200 with empty data for no matches", async () => {
    const res = await agent.get("/api/games?search=nao-existe-nenhum");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
    expect(res.body.pagination.hasNextPage).toBe(false);
  });

  it("list games endpoint shares filter semantics via listId restriction", async () => {
    const listRes = await agent.post("/api/game-lists").send({ name: "QList" });
    const listId = listRes.body.data._id;
    const all = await agent.get("/api/games?search=zelda");
    const gameId = all.body.data[0]._id as string;
    await agent.post(`/api/games/${gameId}/lists/${listId}`);

    const inList = await agent.get(
      `/api/game-lists/${listId}/games?search=zelda`,
    );
    expect(inList.status).toBe(200);
    expect(inList.body.pagination.total).toBe(1);

    const notInList = await agent.get(
      `/api/game-lists/${listId}/games?search=final`,
    );
    expect(notInList.body.pagination.total).toBe(0);
  });
});
