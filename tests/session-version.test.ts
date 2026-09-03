import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
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
import { env } from "../src/config/env";

beforeAll(startMongo);
afterAll(stopMongo);

describe("Session Version", () => {
  describe("User model", () => {
    it("new user has sessionVersion = 0", async () => {
      await register(userA);
      const user = await User.findOne({ email: userA.email.toLowerCase() });
      expect(user!.sessionVersion).toBe(0);
    });

    it("sessionVersion can be incremented", async () => {
      const user = await User.findOne({ email: userA.email.toLowerCase() });
      const oldVersion = user!.sessionVersion;
      await User.findByIdAndUpdate(user!._id, { $inc: { sessionVersion: 1 } });
      const updated = await User.findOne({ email: userA.email.toLowerCase() });
      expect(updated!.sessionVersion).toBe(oldVersion + 1);
    });
  });

  describe("Login includes sessionVersion in JWT", () => {
    it("new user login produces JWT with sessionVersion = 0", async () => {
      await register(userB);
      const res = await request(getApp())
        .post("/api/auth/login")
        .send({ email: userB.email, password: userB.password });

      expect(res.status).toBe(200);
      const cookie = res.headers["set-cookie"][0];
      const token = cookie.split("token=")[1].split(";")[0];
      const decoded = jwt.verify(token, env.JWT_SECRET) as Record<string, unknown>;
      expect(decoded.sessionVersion).toBe(0);
    });

    it("user with sessionVersion N produces JWT with sessionVersion N", async () => {
      const user = await User.findOne({ email: userA.email.toLowerCase() });
      const currentVersion = user!.sessionVersion;

      const res = await request(getApp())
        .post("/api/auth/login")
        .send({ email: userA.email, password: userA.password });

      expect(res.status).toBe(200);
      const cookie = res.headers["set-cookie"][0];
      const token = cookie.split("token=")[1].split(";")[0];
      const decoded = jwt.verify(token, env.JWT_SECRET) as Record<string, unknown>;
      expect(decoded.sessionVersion).toBe(currentVersion);
    });
  });

  describe("Middleware validates sessionVersion", () => {
    let agent: request.Agent;

    beforeAll(async () => {
      agent = request.agent(getApp());
      await agent.post("/api/auth/login").send({
        email: userB.email,
        password: userB.password,
      });
    });

    it("valid JWT + correct version → allowed", async () => {
      const res = await agent.get("/api/auth/me");
      expect(res.status).toBe(200);
    });

    it("expired JWT → 401", async () => {
      const expiredToken = jwt.sign(
        { userId: "000000000000000000000000", sessionVersion: 0 },
        env.JWT_SECRET,
        { expiresIn: "-1s" },
      );
      const res = await request(getApp())
        .get("/api/auth/me")
        .set("Cookie", `token=${expiredToken}`);
      expect(res.status).toBe(401);
    });

    it("invalid JWT → 401", async () => {
      const res = await request(getApp())
        .get("/api/auth/me")
        .set("Cookie", "token=invalid.jwt.token");
      expect(res.status).toBe(401);
    });

    it("no cookie → 401", async () => {
      const res = await request(getApp()).get("/api/auth/me");
      expect(res.status).toBe(401);
    });

    it("empty token → 401", async () => {
      const res = await request(getApp())
        .get("/api/auth/me")
        .set("Cookie", "token=");
      expect(res.status).toBe(401);
    });

    it("userId in nonexistent user → 401", async () => {
      const token = jwt.sign(
        { userId: "000000000000000000000000", sessionVersion: 0 },
        env.JWT_SECRET,
        { expiresIn: "1h" },
      );
      const res = await request(getApp())
        .get("/api/auth/me")
        .set("Cookie", `token=${token}`);
      expect(res.status).toBe(401);
    });

    it("JWT without sessionVersion → 401", async () => {
      const user = await User.findOne({ email: userB.email.toLowerCase() });
      const token = jwt.sign(
        { userId: String(user!._id) },
        env.JWT_SECRET,
        { expiresIn: "1h" },
      );
      const res = await request(getApp())
        .get("/api/auth/me")
        .set("Cookie", `token=${token}`);
      expect(res.status).toBe(401);
    });

    it("wrong sessionVersion → 401", async () => {
      const user = await User.findOne({ email: userB.email.toLowerCase() });
      const token = jwt.sign(
        { userId: String(user!._id), sessionVersion: 999 },
        env.JWT_SECRET,
        { expiresIn: "1h" },
      );
      const res = await request(getApp())
        .get("/api/auth/me")
        .set("Cookie", `token=${token}`);
      expect(res.status).toBe(401);
    });

    it("negative sessionVersion → 401", async () => {
      const user = await User.findOne({ email: userB.email.toLowerCase() });
      const token = jwt.sign(
        { userId: String(user!._id), sessionVersion: -1 },
        env.JWT_SECRET,
        { expiresIn: "1h" },
      );
      const res = await request(getApp())
        .get("/api/auth/me")
        .set("Cookie", `token=${token}`);
      expect(res.status).toBe(401);
    });

    it("decimal sessionVersion → 401", async () => {
      const user = await User.findOne({ email: userB.email.toLowerCase() });
      const token = jwt.sign(
        { userId: String(user!._id), sessionVersion: 1.5 },
        env.JWT_SECRET,
        { expiresIn: "1h" },
      );
      const res = await request(getApp())
        .get("/api/auth/me")
        .set("Cookie", `token=${token}`);
      expect(res.status).toBe(401);
    });

    it("string sessionVersion → 401", async () => {
      const user = await User.findOne({ email: userB.email.toLowerCase() });
      const token = jwt.sign(
        { userId: String(user!._id), sessionVersion: "0" },
        env.JWT_SECRET,
        { expiresIn: "1h" },
      );
      const res = await request(getApp())
        .get("/api/auth/me")
        .set("Cookie", `token=${token}`);
      expect(res.status).toBe(401);
    });

    it("null sessionVersion → 401", async () => {
      const user = await User.findOne({ email: userB.email.toLowerCase() });
      const token = jwt.sign(
        { userId: String(user!._id), sessionVersion: null },
        env.JWT_SECRET,
        { expiresIn: "1h" },
      );
      const res = await request(getApp())
        .get("/api/auth/me")
        .set("Cookie", `token=${token}`);
      expect(res.status).toBe(401);
    });

    it("corrupted payload → 401", async () => {
      const res = await request(getApp())
        .get("/api/auth/me")
        .set("Cookie", "token=eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxMjM0NTY3ODkwIn0.invalid");
      expect(res.status).toBe(401);
    });
  });

  describe("Change password invalidates old sessions", () => {
    it("old JWT is rejected after password change", async () => {
      await register({ name: "Session Test", email: "session@test.com", password: "old-password-123" });

      const loginRes = await request(getApp())
        .post("/api/auth/login")
        .send({ email: "session@test.com", password: "old-password-123" });
      const cookie = loginRes.headers["set-cookie"][0];
      const oldToken = cookie.split("token=")[1].split(";")[0];

      const agent = request.agent(getApp());
      await agent.post("/api/auth/login").send({
        email: "session@test.com",
        password: "old-password-123",
      });
      await agent.post("/api/auth/change-password").send({
        currentPassword: "old-password-123",
        newPassword: "new-password-456",
      });

      const res = await request(getApp())
        .get("/api/auth/me")
        .set("Cookie", `token=${oldToken}`);
      expect(res.status).toBe(401);
    });

    it("new login after change-password works", async () => {
      const res = await request(getApp())
        .post("/api/auth/login")
        .send({ email: "session@test.com", password: "new-password-456" });
      expect(res.status).toBe(200);

      const cookie = res.headers["set-cookie"][0];
      const token = cookie.split("token=")[1].split(";")[0];
      const meRes = await request(getApp())
        .get("/api/auth/me")
        .set("Cookie", `token=${token}`);
      expect(meRes.status).toBe(200);
    });

    it("sessionVersion is incremented by exactly 1", async () => {
      const before = await User.findOne({ email: "session@test.com" });
      const oldVersion = before!.sessionVersion;

      const agent = request.agent(getApp());
      await agent.post("/api/auth/login").send({
        email: "session@test.com",
        password: "new-password-456",
      });
      await agent.post("/api/auth/change-password").send({
        currentPassword: "new-password-456",
        newPassword: "another-password-789",
      });

      const after = await User.findOne({ email: "session@test.com" });
      expect(after!.sessionVersion).toBe(oldVersion + 1);
    });
  });

  describe("Password reset invalidates old sessions", () => {
    it("old JWT is rejected after password reset", async () => {
      const crypto = await import("crypto");
      await register({ name: "Reset Test", email: "reset@test.com", password: "reset-password-123" });

      const loginRes = await request(getApp())
        .post("/api/auth/login")
        .send({ email: "reset@test.com", password: "reset-password-123" });
      const cookie = loginRes.headers["set-cookie"][0];
      const oldToken = cookie.split("token=")[1].split(";")[0];

      await request(getApp())
        .post("/api/auth/forgot-password")
        .send({ email: "reset@test.com" });

      const user = await User.findOne({ email: "reset@test.com" });
      const resetToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

      const { PasswordResetToken } = await import("../src/models/password-reset-token");
      await PasswordResetToken.create({
        tokenHash,
        userId: user!._id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      await request(getApp())
        .post("/api/auth/reset-password")
        .send({ token: resetToken, password: "reset-new-password-123" });

      const res = await request(getApp())
        .get("/api/auth/me")
        .set("Cookie", `token=${oldToken}`);
      expect(res.status).toBe(401);
    });

    it("new login after reset works", async () => {
      const res = await request(getApp())
        .post("/api/auth/login")
        .send({ email: "reset@test.com", password: "reset-new-password-123" });
      expect(res.status).toBe(200);

      const cookie = res.headers["set-cookie"][0];
      const token = cookie.split("token=")[1].split(";")[0];
      const meRes = await request(getApp())
        .get("/api/auth/me")
        .set("Cookie", `token=${token}`);
      expect(meRes.status).toBe(200);
    });
  });

  describe("Multi-device invalidation", () => {
    it("change-password invalidates all sessions across devices", async () => {
      await register({ name: "Multi Test", email: "multi@test.com", password: "multi-password-123" });

      const loginRes = await request(getApp())
        .post("/api/auth/login")
        .send({ email: "multi@test.com", password: "multi-password-123" });
      const cookieA = loginRes.headers["set-cookie"][0];
      const tokenA = cookieA.split("token=")[1].split(";")[0];

      const loginRes2 = await request(getApp())
        .post("/api/auth/login")
        .send({ email: "multi@test.com", password: "multi-password-123" });
      const cookieB = loginRes2.headers["set-cookie"][0];
      const tokenB = cookieB.split("token=")[1].split(";")[0];

      const loginRes3 = await request(getApp())
        .post("/api/auth/login")
        .send({ email: "multi@test.com", password: "multi-password-123" });
      const cookieC = loginRes3.headers["set-cookie"][0];
      const tokenC = cookieC.split("token=")[1].split(";")[0];

      const agent = request.agent(getApp());
      await agent.post("/api/auth/login").send({
        email: "multi@test.com",
        password: "multi-password-123",
      });
      await agent.post("/api/auth/change-password").send({
        currentPassword: "multi-password-123",
        newPassword: "multi-new-password-456",
      });

      const resA = await request(getApp())
        .get("/api/auth/me")
        .set("Cookie", `token=${tokenA}`);
      expect(resA.status).toBe(401);

      const resB = await request(getApp())
        .get("/api/auth/me")
        .set("Cookie", `token=${tokenB}`);
      expect(resB.status).toBe(401);

      const resC = await request(getApp())
        .get("/api/auth/me")
        .set("Cookie", `token=${tokenC}`);
      expect(resC.status).toBe(401);

      const loginRes4 = await request(getApp())
        .post("/api/auth/login")
        .send({ email: "multi@test.com", password: "multi-new-password-456" });
      expect(loginRes4.status).toBe(200);

      const newCookie = loginRes4.headers["set-cookie"][0];
      const newToken = newCookie.split("token=")[1].split(";")[0];
      const resD = await request(getApp())
        .get("/api/auth/me")
        .set("Cookie", `token=${newToken}`);
      expect(resD.status).toBe(200);
    });
  });

  describe("Logout behavior", () => {
    it("logout removes cookie but JWT could still be valid if not for sessionVersion", async () => {
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
  });
});
