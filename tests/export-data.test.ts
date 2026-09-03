import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import {
  getApp,
  login,
  register,
  startMongo,
  stopMongo,
  userA,
  userB,
} from "./helpers";
import { User } from "../src/models/user";
import { GlobalGame } from "../src/models/game";
import { UserGame } from "../src/models/user-game";
import { GameList } from "../src/models/game-list";
import { PasswordResetToken } from "../src/models/password-reset-token";

beforeAll(startMongo);
afterAll(stopMongo);

describe("GET /api/auth/export", () => {
  let agentA: request.Agent;
  let agentB: request.Agent;

  beforeAll(async () => {
    await register(userA);
    await register(userB);

    agentA = request.agent(getApp());
    await agentA.post("/api/auth/login").send({
      email: userA.email,
      password: userA.password,
    });

    agentB = request.agent(getApp());
    await agentB.post("/api/auth/login").send({
      email: userB.email,
      password: userB.password,
    });
  });

  describe("Authentication", () => {
    it("rejects request without authentication", async () => {
      const res = await request(getApp()).get("/api/auth/export");
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
    });

    it("rejects request with invalid JWT", async () => {
      const res = await request(getApp())
        .get("/api/auth/export")
        .set("Cookie", "token=invalid.jwt.token");
      expect(res.status).toBe(401);
    });

    it("authenticated user can export data", async () => {
      const res = await agentA.get("/api/auth/export");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("exportVersion");
      expect(res.body).toHaveProperty("exportedAt");
    });
  });

  describe("Format", () => {
    it("contains exportVersion", async () => {
      const res = await agentA.get("/api/auth/export");
      expect(res.body.exportVersion).toBe(1);
    });

    it("contains exportedAt in ISO 8601 format", async () => {
      const res = await agentA.get("/api/auth/export");
      expect(res.body.exportedAt).toBeDefined();
      const date = new Date(res.body.exportedAt);
      expect(date.toISOString()).toBe(res.body.exportedAt);
    });

    it("contains user data", async () => {
      const res = await agentA.get("/api/auth/export");
      expect(res.body.user).toBeDefined();
      expect(res.body.user.id).toBeDefined();
      expect(res.body.user.name).toBe(userA.name);
      expect(res.body.user.email).toBe(userA.email);
      expect(res.body.user.createdAt).toBeDefined();
      expect(res.body.user.updatedAt).toBeDefined();
    });

    it("contains games array", async () => {
      const res = await agentA.get("/api/auth/export");
      expect(Array.isArray(res.body.games)).toBe(true);
    });

    it("contains lists array", async () => {
      const res = await agentA.get("/api/auth/export");
      expect(Array.isArray(res.body.lists)).toBe(true);
    });

    it("has correct Content-Type", async () => {
      const res = await agentA.get("/api/auth/export");
      expect(res.headers["content-type"]).toContain("application/json");
    });

    it("has Content-Disposition for download", async () => {
      const res = await agentA.get("/api/auth/export");
      expect(res.headers["content-disposition"]).toBe(
        'attachment; filename="save-state-export.json"',
      );
    });
  });

  describe("User data", () => {
    it("does not contain passwordHash", async () => {
      const res = await agentA.get("/api/auth/export");
      expect(res.body.user).not.toHaveProperty("passwordHash");
    });

    it("does not contain password", async () => {
      const res = await agentA.get("/api/auth/export");
      const responseStr = JSON.stringify(res.body);
      expect(responseStr).not.toContain("password");
      expect(responseStr).not.toContain("Password");
    });

    it("IDs are strings", async () => {
      const res = await agentA.get("/api/auth/export");
      expect(typeof res.body.user.id).toBe("string");
    });

    it("dates are ISO strings", async () => {
      const res = await agentA.get("/api/auth/export");
      expect(typeof res.body.user.createdAt).toBe("string");
      expect(typeof res.body.user.updatedAt).toBe("string");
      const date = new Date(res.body.user.createdAt);
      expect(date.toISOString()).toBe(res.body.user.createdAt);
    });
  });

  describe("Games", () => {
    beforeAll(async () => {
      await agentA
        .post("/api/games")
        .send({
          game: {
            name: "Export Test Game",
            genres: ["RPG"],
            platforms: ["PS2"],
            developers: ["Dev"],
            publishers: ["Pub"],
            releaseDate: "2000-03-04",
          },
          status: "playing",
          hoursPlayed: 10,
          timesFinished: 1,
          rating: 7,
          review: "Great game",
        });
    });

    it("user games appear in export", async () => {
      const res = await agentA.get("/api/auth/export");
      expect(res.body.games.length).toBeGreaterThan(0);
      const game = res.body.games.find(
        (g: { game: { name: string } }) =>
          g.game.name === "Export Test Game",
      );
      expect(game).toBeDefined();
    });

    it("game contains GlobalGame metadata", async () => {
      const res = await agentA.get("/api/auth/export");
      const game = res.body.games.find(
        (g: { game: { name: string } }) =>
          g.game.name === "Export Test Game",
      );
      expect(game.game.genres).toContain("RPG");
      expect(game.game.platforms).toContain("PS2");
      expect(game.game.developers).toContain("Dev");
      expect(game.game.publishers).toContain("Pub");
      expect(game.game.source).toBe("manual");
      expect(game.game.slug).toBeDefined();
    });

    it("game contains personal data", async () => {
      const res = await agentA.get("/api/auth/export");
      const game = res.body.games.find(
        (g: { game: { name: string } }) =>
          g.game.name === "Export Test Game",
      );
      expect(game.status).toBe("playing");
      expect(game.hoursPlayed).toBe(10);
      expect(game.timesFinished).toBe(1);
      expect(game.rating).toBe(7);
      expect(game.review).toBe("Great game");
    });

    it("game IDs are strings", async () => {
      const res = await agentA.get("/api/auth/export");
      const game = res.body.games[0];
      expect(typeof game.id).toBe("string");
      expect(typeof game.game.id).toBe("string");
    });

    it("game dates are ISO strings", async () => {
      const res = await agentA.get("/api/auth/export");
      const game = res.body.games[0];
      expect(typeof game.createdAt).toBe("string");
      expect(typeof game.updatedAt).toBe("string");
    });
  });

  describe("Ownership / Isolation", () => {
    beforeAll(async () => {
      await agentB
        .post("/api/games")
        .send({
          game: {
            name: "User B Game",
            genres: ["Action"],
            platforms: ["PS1"],
          },
          status: "finished",
        });

      await agentB
        .post("/api/game-lists")
        .send({ name: "User B List" });
    });

    it("user A export does not contain user B games", async () => {
      const res = await agentA.get("/api/auth/export");
      const gameNames = res.body.games.map(
        (g: { game: { name: string } }) => g.game.name,
      );
      expect(gameNames).not.toContain("User B Game");
    });

    it("user A export does not contain user B lists", async () => {
      const res = await agentA.get("/api/auth/export");
      const listNames = res.body.lists.map(
        (l: { name: string }) => l.name,
      );
      expect(listNames).not.toContain("User B List");
    });

    it("user B export contains user B games", async () => {
      const res = await agentB.get("/api/auth/export");
      const gameNames = res.body.games.map(
        (g: { game: { name: string } }) => g.game.name,
      );
      expect(gameNames).toContain("User B Game");
    });

    it("user B export contains user B lists", async () => {
      const res = await agentB.get("/api/auth/export");
      const listNames = res.body.lists.map(
        (l: { name: string }) => l.name,
      );
      expect(listNames).toContain("User B List");
    });

    it("user A user ID is different from user B user ID", async () => {
      const resA = await agentA.get("/api/auth/export");
      const resB = await agentB.get("/api/auth/export");
      expect(resA.body.user.id).not.toBe(resB.body.user.id);
    });
  });

  describe("Lists", () => {
    let listId: string;

    beforeAll(async () => {
      const listRes = await agentA
        .post("/api/game-lists")
        .send({ name: "Export Test List" });
      listId = listRes.body.data._id;

      const gamesRes = await agentA.get("/api/games");
      if (gamesRes.body.data.length > 0) {
        const gameId = gamesRes.body.data[0]._id;
        await agentA.post(`/api/games/${gameId}/lists/${listId}`);
      }
    });

    it("user lists appear in export", async () => {
      const res = await agentA.get("/api/auth/export");
      const list = res.body.lists.find(
        (l: { name: string }) => l.name === "Export Test List",
      );
      expect(list).toBeDefined();
    });

    it("list has correct format", async () => {
      const res = await agentA.get("/api/auth/export");
      const list = res.body.lists.find(
        (l: { name: string }) => l.name === "Export Test List",
      );
      expect(typeof list.id).toBe("string");
      expect(typeof list.name).toBe("string");
      expect(typeof list.createdAt).toBe("string");
      expect(typeof list.updatedAt).toBe("string");
    });

    it("game listIds reference exported lists", async () => {
      const res = await agentA.get("/api/auth/export");
      const list = res.body.lists.find(
        (l: { name: string }) => l.name === "Export Test List",
      );
      const gameWithList = res.body.games.find(
        (g: { listIds: string[] }) =>
          g.listIds.includes(list.id),
      );
      expect(gameWithList).toBeDefined();
    });
  });

  describe("Empty library", () => {
    let emptyAgent: request.Agent;

    beforeAll(async () => {
      await register({
        name: "Empty User",
        email: "empty@test.com",
        password: "password-123",
      });
      emptyAgent = request.agent(getApp());
      await emptyAgent.post("/api/auth/login").send({
        email: "empty@test.com",
        password: "password-123",
      });
    });

    it("returns valid JSON with empty arrays", async () => {
      const res = await emptyAgent.get("/api/auth/export");
      expect(res.status).toBe(200);
      expect(res.body.games).toEqual([]);
      expect(res.body.lists).toEqual([]);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe("empty@test.com");
    });
  });

  describe("GlobalGame", () => {
    it("only GlobalGames associated with user games appear", async () => {
      const allGames = await GlobalGame.find({});
      const res = await agentA.get("/api/auth/export");
      const exportedGameIds = res.body.games.map(
        (g: { game: { id: string } }) => g.game.id,
      );

      for (const exportedId of exportedGameIds) {
        const game = allGames.find(
          (g) => String(g._id) === exportedId,
        );
        expect(game).toBeDefined();
      }
    });

    it("GlobalGames not used by user do not appear as standalone entries", async () => {
      const res = await agentA.get("/api/auth/export");
      const exportedGameIds = res.body.games.map(
        (g: { game: { id: string } }) => g.game.id,
      );

      const userGameIds = await UserGame.find({
        userId: (await User.findOne({ email: userA.email.toLowerCase() }))!
          ._id,
      }).then((ugs) => ugs.map((ug) => String(ug.gameId)));

      expect(exportedGameIds.sort()).toEqual(userGameIds.sort());
    });
  });

  describe("Security regression", () => {
    it("PasswordResetToken never appears in export", async () => {
      await PasswordResetToken.create({
        tokenHash: "fake-hash-for-test",
        userId: (
          await User.findOne({ email: userA.email.toLowerCase() })
        )!._id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      const res = await agentA.get("/api/auth/export");
      const responseStr = JSON.stringify(res.body);
      expect(responseStr).not.toContain("PasswordResetToken");
      expect(responseStr).not.toContain("tokenHash");
      expect(responseStr).not.toContain("fake-hash-for-test");
    });

    it("passwordHash never appears in export", async () => {
      const user = await User.findOne({
        email: userA.email.toLowerCase(),
      });
      const res = await agentA.get("/api/auth/export");
      const responseStr = JSON.stringify(res.body);
      expect(responseStr).not.toContain(user!.passwordHash);
    });

    it("no JWT appears in export", async () => {
      const res = await agentA.get("/api/auth/export");
      const responseStr = JSON.stringify(res.body);
      expect(responseStr).not.toContain("eyJ");
      expect(responseStr).not.toContain("jwt");
      expect(responseStr).not.toContain("JWT");
    });

    it("no data from other users appears", async () => {
      const userBDoc = await User.findOne({
        email: userB.email.toLowerCase(),
      });
      const res = await agentA.get("/api/auth/export");
      const responseStr = JSON.stringify(res.body);
      expect(responseStr).not.toContain(String(userBDoc!._id));
      expect(responseStr).not.toContain(userB.email);
    });
  });
});
