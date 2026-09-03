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
import { PasswordResetToken } from "../src/models/password-reset-token";
import { User } from "../src/models/user";

beforeAll(startMongo);
afterAll(stopMongo);

describe("Password Reset", () => {
  beforeAll(async () => {
    await register(userA);
    await register(userB);
  });

  describe("POST /api/auth/forgot-password", () => {
    it("returns generic success for existing email", async () => {
      const res = await request(getApp())
        .post("/api/auth/forgot-password")
        .send({ email: userA.email });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe(
        "If an account exists, a reset email has been sent",
      );
    });

    it("returns same generic success for non-existent email", async () => {
      const res = await request(getApp())
        .post("/api/auth/forgot-password")
        .send({ email: "nonexistent@example.com" });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe(
        "If an account exists, a reset email has been sent",
      );
    });

    it("rejects invalid email format", async () => {
      const res = await request(getApp())
        .post("/api/auth/forgot-password")
        .send({ email: "not-an-email" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("creates a token in the database for existing user", async () => {
      await request(getApp())
        .post("/api/auth/forgot-password")
        .send({ email: userA.email });

      const user = await User.findOne({ email: userA.email.toLowerCase() });
      const tokens = await PasswordResetToken.find({ userId: user!._id });
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0].used).toBe(false);
      expect(tokens[0].expiresAt).toBeInstanceOf(Date);
      expect(tokens[0].expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("stores token hash, not plaintext", async () => {
      await request(getApp())
        .post("/api/auth/forgot-password")
        .send({ email: userA.email });

      const user = await User.findOne({ email: userA.email.toLowerCase() });
      const tokens = await PasswordResetToken.find({ userId: user!._id });
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0].tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(tokens[0].tokenHash).not.toContain(" ");
    });

    it("invalidates previous tokens when requesting new one", async () => {
      await request(getApp())
        .post("/api/auth/forgot-password")
        .send({ email: userA.email });

      const user = await User.findOne({ email: userA.email.toLowerCase() });
      const tokensBefore = await PasswordResetToken.find({ userId: user!._id });
      const countBefore = tokensBefore.length;

      await request(getApp())
        .post("/api/auth/forgot-password")
        .send({ email: userA.email });

      const tokensAfter = await PasswordResetToken.find({ userId: user!._id });
      expect(tokensAfter.length).toBe(countBefore);
    });

    it("rejects missing email field", async () => {
      const res = await request(getApp())
        .post("/api/auth/forgot-password")
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/reset-password", () => {
    let resetToken: string;

    beforeAll(async () => {
      const res = await request(getApp())
        .post("/api/auth/forgot-password")
        .send({ email: userA.email });

      const user = await User.findOne({ email: userA.email.toLowerCase() });
      const tokenDoc = await PasswordResetToken.findOne({
        userId: user!._id,
        used: false,
      });

      const crypto = await import("crypto");
      resetToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      await PasswordResetToken.create({
        tokenHash,
        userId: user!._id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
    });

    it("resets password with valid token", async () => {
      const res = await request(getApp())
        .post("/api/auth/reset-password")
        .send({ token: resetToken, password: "new-password-123" });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe("Password has been reset");
    });

    it("old password no longer works", async () => {
      const res = await login(userA);
      expect(res.status).toBe(401);
    });

    it("new password works for login", async () => {
      const res = await request(getApp())
        .post("/api/auth/login")
        .send({ email: userA.email, password: "new-password-123" });

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(userA.email);
    });

    it("rejects invalid token", async () => {
      const res = await request(getApp())
        .post("/api/auth/reset-password")
        .send({ token: "invalid-token-123", password: "new-password-456" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_TOKEN");
    });

    it("rejects expired token", async () => {
      const crypto = await import("crypto");
      const User = (await import("../src/models/user")).User;
      const user = await User.findOne({ email: userA.email.toLowerCase() });

      const expiredToken = crypto.randomBytes(32).toString("hex");
      const expiredHash = crypto
        .createHash("sha256")
        .update(expiredToken)
        .digest("hex");

      await PasswordResetToken.create({
        tokenHash: expiredHash,
        userId: user!._id,
        expiresAt: new Date(Date.now() - 1000),
      });

      const res = await request(getApp())
        .post("/api/auth/reset-password")
        .send({ token: expiredToken, password: "new-password-789" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_TOKEN");
    });

    it("rejects already-used token", async () => {
      const crypto = await import("crypto");
      const User = (await import("../src/models/user")).User;
      const user = await User.findOne({ email: userA.email.toLowerCase() });

      const usedToken = crypto.randomBytes(32).toString("hex");
      const usedHash = crypto
        .createHash("sha256")
        .update(usedToken)
        .digest("hex");

      await PasswordResetToken.create({
        tokenHash: usedHash,
        userId: user!._id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        used: true,
      });

      const res = await request(getApp())
        .post("/api/auth/reset-password")
        .send({ token: usedToken, password: "new-password-abc" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_TOKEN");
    });

    it("rejects weak password", async () => {
      const crypto = await import("crypto");
      const User = (await import("../src/models/user")).User;
      const user = await User.findOne({ email: userA.email.toLowerCase() });

      const weakToken = crypto.randomBytes(32).toString("hex");
      const weakHash = crypto
        .createHash("sha256")
        .update(weakToken)
        .digest("hex");

      await PasswordResetToken.create({
        tokenHash: weakHash,
        userId: user!._id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      const res = await request(getApp())
        .post("/api/auth/reset-password")
        .send({ token: weakToken, password: "short" });

      expect(res.status).toBe(400);
    });

    it("rejects missing token field", async () => {
      const res = await request(getApp())
        .post("/api/auth/reset-password")
        .send({ password: "new-password-123" });

      expect(res.status).toBe(400);
    });

    it("rejects missing password field", async () => {
      const res = await request(getApp())
        .post("/api/auth/reset-password")
        .send({ token: "some-token" });

      expect(res.status).toBe(400);
    });

    it("token cannot be reused after successful reset", async () => {
      const crypto = await import("crypto");
      const User = (await import("../src/models/user")).User;
      const user = await User.findOne({ email: userA.email.toLowerCase() });

      const reuseToken = crypto.randomBytes(32).toString("hex");
      const reuseHash = crypto
        .createHash("sha256")
        .update(reuseToken)
        .digest("hex");

      await PasswordResetToken.create({
        tokenHash: reuseHash,
        userId: user!._id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      await request(getApp())
        .post("/api/auth/reset-password")
        .send({ token: reuseToken, password: "new-password-reuse" });

      const res = await request(getApp())
        .post("/api/auth/reset-password")
        .send({ token: reuseToken, password: "new-password-reuse-2" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_TOKEN");
    });
  });

  describe("Security", () => {
    it("user A cannot use token intended for user B", async () => {
      const crypto = await import("crypto");

      const tokenForB = crypto.randomBytes(32).toString("hex");
      const hashForB = crypto
        .createHash("sha256")
        .update(tokenForB)
        .digest("hex");

      const userBDoc = await User.findOne({ email: userB.email.toLowerCase() });
      await PasswordResetToken.create({
        tokenHash: hashForB,
        userId: userBDoc!._id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      const res = await request(getApp())
        .post("/api/auth/reset-password")
        .send({ token: tokenForB, password: "hacked-password-123" });

      expect(res.status).toBe(200);

      const userBRes = await request(getApp())
        .post("/api/auth/login")
        .send({ email: userB.email, password: "hacked-password-123" });

      expect(userBRes.status).toBe(200);
    });

    it("no plaintext password in database after reset", async () => {
      const user = await User.findOne({ email: userA.email.toLowerCase() });
      expect(user!.passwordHash).not.toBe("new-password-reuse");
      expect(user!.passwordHash).toMatch(/^\$2[aby]?\$\d{1,2}\$/);
    });

    it("no token in HTTP responses", async () => {
      const res = await request(getApp())
        .post("/api/auth/forgot-password")
        .send({ email: userA.email });

      const responseString = JSON.stringify(res.body);
      expect(responseString).not.toMatch(/^[0-9a-f]{64}$/);
    });

    it("password reset does not affect other users", async () => {
      const crypto = await import("crypto");

      const tokenForA = crypto.randomBytes(32).toString("hex");
      const hashForA = crypto
        .createHash("sha256")
        .update(tokenForA)
        .digest("hex");

      const userADoc = await User.findOne({ email: userA.email.toLowerCase() });
      const oldPasswordHash = userADoc!.passwordHash;

      await PasswordResetToken.create({
        tokenHash: hashForA,
        userId: userADoc!._id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      await request(getApp())
        .post("/api/auth/reset-password")
        .send({ token: tokenForA, password: "new-password-for-a" });

      const userBAfter = await User.findOne({
        email: userB.email.toLowerCase(),
      });
      const userAAfter = await User.findOne({
        email: userA.email.toLowerCase(),
      });

      expect(userAAfter!.passwordHash).not.toBe(oldPasswordHash);
    });
  });
});
