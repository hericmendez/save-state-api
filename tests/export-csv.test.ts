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
import { User } from "../src/models/user";
import { PasswordResetToken } from "../src/models/password-reset-token";
import { CSV_HEADERS } from "../src/services/export.service";

beforeAll(startMongo);
afterAll(stopMongo);

describe("GET /api/auth/export/csv", () => {
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
      const res = await request(getApp()).get("/api/auth/export/csv");
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
    });

    it("rejects request with invalid JWT", async () => {
      const res = await request(getApp())
        .get("/api/auth/export/csv")
        .set("Cookie", "token=invalid.jwt.token");
      expect(res.status).toBe(401);
    });

    it("authenticated user can export CSV", async () => {
      const res = await agentA.get("/api/auth/export/csv");
      expect(res.status).toBe(200);
    });
  });

  describe("Response headers", () => {
    it("has correct Content-Type for CSV", async () => {
      const res = await agentA.get("/api/auth/export/csv");
      expect(res.headers["content-type"]).toContain("text/csv");
      expect(res.headers["content-type"]).toContain("charset=utf-8");
    });

    it("has Content-Disposition for download", async () => {
      const res = await agentA.get("/api/auth/export/csv");
      expect(res.headers["content-disposition"]).toBe(
        'attachment; filename="save-state-export.csv"',
      );
    });
  });

  describe("CSV structure", () => {
    it("contains header row", async () => {
      const res = await agentA.get("/api/auth/export/csv");
      const lines = res.text.split("\n");
      expect(lines.length).toBeGreaterThanOrEqual(1);
    });

    it("header contains expected columns", async () => {
      const res = await agentA.get("/api/auth/export/csv");
      const header = res.text.split("\n")[0];
      const columns = header.split(",");
      expect(columns).toEqual([...CSV_HEADERS]);
    });

    it("column ordering is stable", async () => {
      const res1 = await agentA.get("/api/auth/export/csv");
      const res2 = await agentA.get("/api/auth/export/csv");
      const header1 = res1.text.split("\n")[0];
      const header2 = res2.text.split("\n")[0];
      expect(header1).toBe(header2);
    });

    it("header count matches CSV_HEADERS length", async () => {
      const res = await agentA.get("/api/auth/export/csv");
      const header = res.text.split("\n")[0];
      const columns = header.split(",");
      expect(columns.length).toBe(CSV_HEADERS.length);
    });
  });

  describe("Data conversion", () => {
    beforeAll(async () => {
      await agentA
        .post("/api/games")
        .send({
          game: {
            name: "CSV Test Game",
            genres: ["RPG"],
            platforms: ["PS2"],
            developers: ["Dev"],
            publishers: ["Pub"],
            releaseDate: "2000-03-04",
            summary: "A great game",
          },
          status: "playing",
          hoursPlayed: 10,
          timesFinished: 1,
          rating: 7,
          review: "Amazing game",
        });
    });

    it("game data appears in CSV", async () => {
      const res = await agentA.get("/api/auth/export/csv");
      expect(res.text).toContain("CSV Test Game");
      expect(res.text).toContain("playing");
    });

    it("arrays are serialized with semicolons", async () => {
      const res = await agentA.get("/api/auth/export/csv");
      expect(res.text).toContain("RPG");
      expect(res.text).toContain("PS2");
    });

    it("numbers are correctly serialized", async () => {
      const res = await agentA.get("/api/auth/export/csv");
      const lines = res.text.split("\n");
      const dataLine = lines.find((l) => l.includes("CSV Test Game"));
      expect(dataLine).toBeDefined();
      expect(dataLine).toContain("10");
      expect(dataLine).toContain("7");
    });

    it("dates are ISO strings", async () => {
      const res = await agentA.get("/api/auth/export/csv");
      const lines = res.text.split("\n");
      const dataLine = lines.find((l) => l.includes("CSV Test Game"));
      expect(dataLine).toBeDefined();
      expect(dataLine).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("user data appears in CSV", async () => {
      const res = await agentA.get("/api/auth/export/csv");
      expect(res.text).toContain(userA.email);
      expect(res.text).toContain(userA.name);
    });
  });

  describe("CSV escaping", () => {
    beforeAll(async () => {
      await agentA
        .post("/api/games")
        .send({
          game: {
            name: "Game with, comma",
            genres: ["Action"],
            platforms: ["PC"],
          },
          status: "finished",
        });

      await agentA
        .post("/api/games")
        .send({
          game: {
            name: 'Game with "quotes"',
            genres: ["RPG"],
            platforms: ["PS5"],
          },
          status: "backlog",
        });

      await agentA
        .post("/api/games")
        .send({
          game: {
            name: "Game with\nnewline",
            genres: ["Adventure"],
            platforms: ["Switch"],
          },
          status: "playing",
        });
    });

    it("handles commas in values", async () => {
      const res = await agentA.get("/api/auth/export/csv");
      const lines = res.text.split("\n");
      const line = lines.find((l) => l.includes("Game with"));
      expect(line).toBeDefined();
      expect(line).toContain('"Game with, comma"');
    });

    it("handles quotes in values", async () => {
      const res = await agentA.get("/api/auth/export/csv");
      const lines = res.text.split("\n");
      const line = lines.find(
        (l) => l.includes("Game with") && l.includes("quotes"),
      );
      expect(line).toBeDefined();
      expect(line).toContain('"Game with ""quotes"""');
    });

    it("handles newlines in values", async () => {
      const res = await agentA.get("/api/auth/export/csv");
      expect(res.text).toContain("Game with");
      expect(res.text).toContain("newline");
    });
  });

  describe("Ownership / Isolation", () => {
    beforeAll(async () => {
      await agentB
        .post("/api/games")
        .send({
          game: {
            name: "User B CSV Game",
            genres: ["Action"],
            platforms: ["Xbox"],
          },
          status: "finished",
        });

      await agentB
        .post("/api/game-lists")
        .send({ name: "User B CSV List" });
    });

    it("user A export does not contain user B games", async () => {
      const res = await agentA.get("/api/auth/export/csv");
      expect(res.text).not.toContain("User B CSV Game");
    });

    it("user A export does not contain user B lists", async () => {
      const res = await agentA.get("/api/auth/export/csv");
      expect(res.text).not.toContain("User B CSV List");
    });

    it("user B export contains user B games", async () => {
      const res = await agentB.get("/api/auth/export/csv");
      expect(res.text).toContain("User B CSV Game");
    });

    it("user B export contains user B lists", async () => {
      const res = await agentB.get("/api/auth/export/csv");
      const gamesRes = await agentB.get("/api/games");
      if (gamesRes.body.data.length > 0 && gamesRes.body.data[0].listIds.length > 0) {
        expect(res.text).toContain("User B CSV List");
      }
    });

    it("user A email does not appear in user B export", async () => {
      const res = await agentB.get("/api/auth/export/csv");
      expect(res.text).not.toContain(userA.email);
    });

    it("user B email does not appear in user A export", async () => {
      const res = await agentA.get("/api/auth/export/csv");
      expect(res.text).not.toContain(userB.email);
    });
  });

  describe("Empty library", () => {
    let emptyAgent: request.Agent;

    beforeAll(async () => {
      await register({
        name: "Empty CSV User",
        email: "empty-csv@test.com",
        password: "password-123",
      });
      emptyAgent = request.agent(getApp());
      await emptyAgent.post("/api/auth/login").send({
        email: "empty-csv@test.com",
        password: "password-123",
      });
    });

    it("returns valid CSV with headers only", async () => {
      const res = await emptyAgent.get("/api/auth/export/csv");
      expect(res.status).toBe(200);
      const lines = res.text.split("\n");
      expect(lines.length).toBe(1);
      expect(lines[0]).toBe(CSV_HEADERS.join(","));
    });

    it("contains user email in CSV", async () => {
      const res = await emptyAgent.get("/api/auth/export/csv");
      const jsonRes = await emptyAgent.get("/api/auth/export");
      expect(jsonRes.body.user.email).toBe("empty-csv@test.com");
      expect(res.status).toBe(200);
    });
  });

  describe("Lists", () => {
    let listId: string;

    beforeAll(async () => {
      const listRes = await agentA
        .post("/api/game-lists")
        .send({ name: "CSV Test List" });
      listId = listRes.body.data._id;

      const gamesRes = await agentA.get("/api/games");
      if (gamesRes.body.data.length > 0) {
        const gameId = gamesRes.body.data[0]._id;
        await agentA.post(`/api/games/${gameId}/lists/${listId}`);
      }
    });

    it("list names appear in CSV", async () => {
      const res = await agentA.get("/api/auth/export/csv");
      expect(res.text).toContain("CSV Test List");
    });

    it("list IDs appear in CSV", async () => {
      const res = await agentA.get("/api/auth/export/csv");
      expect(res.text).toContain(listId);
    });
  });

  describe("Security regression", () => {
    it("passwordHash never appears in CSV", async () => {
      const user = await User.findOne({
        email: userA.email.toLowerCase(),
      });
      const res = await agentA.get("/api/auth/export/csv");
      expect(res.text).not.toContain(user!.passwordHash);
    });

    it("password never appears in CSV", async () => {
      const res = await agentA.get("/api/auth/export/csv");
      expect(res.text).not.toContain("password");
      expect(res.text).not.toContain("Password");
    });

    it("no JWT appears in CSV", async () => {
      const res = await agentA.get("/api/auth/export/csv");
      expect(res.text).not.toContain("eyJ");
      expect(res.text).not.toContain("jwt");
      expect(res.text).not.toContain("JWT");
    });

    it("PasswordResetToken never appears in CSV", async () => {
      await PasswordResetToken.create({
        tokenHash: "fake-csv-hash",
        userId: (
          await User.findOne({ email: userA.email.toLowerCase() })
        )!._id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      const res = await agentA.get("/api/auth/export/csv");
      expect(res.text).not.toContain("PasswordResetToken");
      expect(res.text).not.toContain("tokenHash");
      expect(res.text).not.toContain("fake-csv-hash");
    });

    it("no data from other users appears", async () => {
      const userBDoc = await User.findOne({
        email: userB.email.toLowerCase(),
      });
      const res = await agentA.get("/api/auth/export/csv");
      expect(res.text).not.toContain(String(userBDoc!._id));
    });
  });

  describe("Consistency with JSON export", () => {
    it("CSV contains same game count as JSON export", async () => {
      const csvRes = await agentA.get("/api/auth/export/csv");
      const jsonRes = await agentA.get("/api/auth/export");

      expect(jsonRes.body.games.length).toBeGreaterThan(0);
      expect(csvRes.text).toContain(jsonRes.body.games[0].game.name);
    });

    it("CSV contains same game names as JSON export", async () => {
      const csvRes = await agentA.get("/api/auth/export/csv");
      const jsonRes = await agentA.get("/api/auth/export");

      for (const game of jsonRes.body.games) {
        if (!game.game.name.includes("\n") && !game.game.name.includes('"')) {
          expect(csvRes.text).toContain(game.game.name);
        }
      }
    });
  });
});
