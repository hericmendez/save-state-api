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

beforeAll(startMongo);
afterAll(stopMongo);

describe("Auth", () => {
  it("registers a new user", async () => {
    const res = await register(userA);
    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe(userA.email);
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it("rejects duplicate email", async () => {
    const res = await register(userA);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("EMAIL_ALREADY_IN_USE");
  });

  it("rejects invalid registration payload", async () => {
    const res = await request(getApp())
      .post("/api/auth/register")
      .send({ name: "", email: "not-an-email", password: "short" });
    expect(res.status).toBe(400);
  });

  it("logs in with valid credentials and sets httpOnly cookie", async () => {
    const res = await login(userA);
    expect(res.status).toBe(200);
    const setCookie = res.headers["set-cookie"][0];
    expect(setCookie).toContain("token=");
    expect(setCookie.toLowerCase()).toContain("httponly");
  });

  it("rejects invalid login", async () => {
    const res = await login({ ...userA, password: "wrong-password" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("me returns the authenticated user", async () => {
    const agent = request.agent(getApp());
    await agent.post("/api/auth/login").send({
      email: userA.email,
      password: userA.password,
    });
    const res = await agent.get("/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(userA.email);
  });

  it("rejects me without authentication", async () => {
    const res = await request(getApp()).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("rejects invalid JWT cookie", async () => {
    const res = await request(getApp())
      .get("/api/auth/me")
      .set("Cookie", "token=invalid.jwt.token");
    expect(res.status).toBe(401);
  });

  it("logout clears the session cookie", async () => {
    const agent = request.agent(getApp());
    await agent.post("/api/auth/login").send({
      email: userA.email,
      password: userA.password,
    });
    const res = await agent.post("/api/logout");
    expect(res.status).toBe(200);
    const setCookie = String(res.headers["set-cookie"][0]);
    expect(setCookie).toMatch(/token=;/);
  });

  it("rejects games access after logout (cookie no longer valid)", async () => {
    const res = await request(getApp()).get("/api/games");
    expect(res.status).toBe(401);
  });
});
