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
        name: "Stat Game NES RPG",
        genres: ["RPG"],
        platforms: ["NES"],
        developers: ["Nintendo"],
        publishers: ["Nintendo"],
        releaseDate: "1986-06-06",
      },
      status: "replaying" as const,
      hoursPlayed: 10,
      timesFinished: 1,
      rating: 8,
    },
    {
      game: {
        name: "Stat Game PS1 Action",
        genres: ["Action"],
        platforms: ["PS1"],
        developers: ["Konami"],
        publishers: ["Konami"],
        releaseDate: "1998-09-30",
      },
      status: "playing" as const,
      hoursPlayed: 30,
      timesFinished: 0,
    },
  ];

  for (const g of games) {
    await agent.post("/api/games").send(g);
  }
});

afterAll(stopMongo);

describe("Dashboard / Stats", () => {
  it("computes totals over the full filtered universe", async () => {
    const res = await agent.get("/api/games/stats");
    expect(res.status).toBe(200);
    expect(res.body.data.totalGames).toBe(2);
    expect(res.body.data.totalHoursPlayed).toBe(40);
    expect(res.body.data.totalTimesFinished).toBe(1);
  });

  it("returns distributions", async () => {
    const res = await agent.get("/api/games/stats");
    const data = res.body.data;
    expect(data.byStatus).toEqual({ replaying: 1, playing: 1 });
    expect(data.byGenre).toEqual({ RPG: 1, Action: 1 });
    expect(data.byPlatform).toEqual({ NES: 1, PS1: 1 });
    expect(data.byDeveloper).toEqual({ Nintendo: 1, Konami: 1 });
    expect(data.byReleaseYear).toEqual({ "1986": 1, "1998": 1 });
    expect(data.byRating).toEqual({ "8": 1 });
  });

  it("stats respect the same filters as the listing", async () => {
    const filtered = await agent.get("/api/games/stats?platform=NES");
    expect(filtered.body.data.totalGames).toBe(1);
    expect(filtered.body.data.byPlatform).toEqual({ NES: 1 });

    const listing = await agent.get("/api/games?platform=NES");
    expect(listing.body.pagination.total).toBe(
      filtered.body.data.totalGames,
    );
  });

  it("pagination params do not affect stats", async () => {
    const withPage = await agent.get("/api/games/stats?page=1&limit=1");
    expect(withPage.body.data.totalGames).toBe(2);
  });

  it("empty universe returns zeroed stats without error", async () => {
    const res = await agent.get("/api/games/stats?search=inexistente");
    expect(res.status).toBe(200);
    expect(res.body.data.totalGames).toBe(0);
    expect(res.body.data.byStatus).toEqual({});
  });

  it("requires authentication", async () => {
    const res = await request(getApp()).get("/api/games/stats");
    expect(res.status).toBe(401);
  });
});
