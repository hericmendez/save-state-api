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

beforeAll(startMongo);
afterAll(stopMongo);

describe("PATCH /api/auth/me — Update Username", () => {
  beforeAll(async () => {
    await register(userA);
    await register(userB);
  });

  describe("Happy path", () => {
    it("authenticated user can update their name", async () => {
      const agent = request.agent(getApp());
      await agent.post("/api/auth/login").send({
        email: userA.email,
        password: userA.password,
      });

      const res = await agent
        .patch("/api/auth/me")
        .send({ name: "Updated Name" });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Updated Name");
      expect(res.body.data.email).toBe(userA.email);
      expect(res.body.data.id).toBeDefined();
    });

    it("new name is persisted in the database", async () => {
      const user = await User.findOne({ email: userA.email.toLowerCase() });
      expect(user!.name).toBe("Updated Name");
    });

    it("response has expected format (no passwordHash)", async () => {
      const agent = request.agent(getApp());
      await agent.post("/api/auth/login").send({
        email: userA.email,
        password: userA.password,
      });

      const res = await agent
        .patch("/api/auth/me")
        .send({ name: "Another Name" });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("id");
      expect(res.body.data).toHaveProperty("name");
      expect(res.body.data).toHaveProperty("email");
      expect(res.body.data).not.toHaveProperty("passwordHash");
      expect(res.body.data).not.toHaveProperty("_id");
      expect(res.body.data).not.toHaveProperty("createdAt");
      expect(res.body.data).not.toHaveProperty("updatedAt");
    });

    it("name is trimmed", async () => {
      const agent = request.agent(getApp());
      await agent.post("/api/auth/login").send({
        email: userA.email,
        password: userA.password,
      });

      const res = await agent
        .patch("/api/auth/me")
        .send({ name: "  Trimmed Name  " });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Trimmed Name");
    });
  });

  describe("Authentication", () => {
    it("rejects request without authentication", async () => {
      const res = await request(getApp())
        .patch("/api/auth/me")
        .send({ name: "No Auth" });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
    });

    it("rejects request with invalid JWT", async () => {
      const res = await request(getApp())
        .patch("/api/auth/me")
        .set("Cookie", "token=invalid.jwt.token")
        .send({ name: "Invalid Token" });

      expect(res.status).toBe(401);
    });

    it("existing GET /api/auth/me still works", async () => {
      const agent = request.agent(getApp());
      await agent.post("/api/auth/login").send({
        email: userA.email,
        password: userA.password,
      });

      const res = await agent.get("/api/auth/me");
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(userA.email);
    });
  });

  describe("Validation", () => {
    let agent: request.Agent;

    beforeAll(async () => {
      agent = request.agent(getApp());
      await agent.post("/api/auth/login").send({
        email: userA.email,
        password: userA.password,
      });
    });

    it("rejects empty name", async () => {
      const res = await agent
        .patch("/api/auth/me")
        .send({ name: "" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects missing name field", async () => {
      const res = await agent
        .patch("/api/auth/me")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects name that is too long", async () => {
      const res = await agent
        .patch("/api/auth/me")
        .send({ name: "a".repeat(101) });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects non-string name", async () => {
      const res = await agent
        .patch("/api/auth/me")
        .send({ name: 123 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects unexpected fields", async () => {
      const res = await agent
        .patch("/api/auth/me")
        .send({ name: "Valid Name", email: "hacked@test.com" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Security", () => {
    let agentA: request.Agent;
    let agentB: request.Agent;

    beforeAll(async () => {
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

    it("cannot change email via this endpoint", async () => {
      const originalEmail = userA.email;
      const res = await agentA
        .patch("/api/auth/me")
        .send({ name: "Hacker", email: "new@test.com" });

      expect(res.status).toBe(400);

      const user = await User.findOne({ email: originalEmail.toLowerCase() });
      expect(user).toBeDefined();
      expect(user!.email).toBe(originalEmail.toLowerCase());
    });

    it("cannot change passwordHash via this endpoint", async () => {
      const userBefore = await User.findOne({
        email: userA.email.toLowerCase(),
      });
      const originalHash = userBefore!.passwordHash;

      const res = await agentA
        .patch("/api/auth/me")
        .send({ name: "Still Hacker", passwordHash: "fake-hash" });

      expect(res.status).toBe(400);

      const userAfter = await User.findOne({
        email: userA.email.toLowerCase(),
      });
      expect(userAfter!.passwordHash).toBe(originalHash);
    });

    it("cannot change userId via this endpoint", async () => {
      const userBefore = await User.findOne({
        email: userA.email.toLowerCase(),
      });
      const originalId = String(userBefore!._id);

      const res = await agentA
        .patch("/api/auth/me")
        .send({ name: "Id Hacker", _id: new mongoose.Types.ObjectId() });

      expect(res.status).toBe(400);

      const userAfter = await User.findOne({
        email: userA.email.toLowerCase(),
      });
      expect(String(userAfter!._id)).toBe(originalId);
    });

    it("user A updating name does not affect user B", async () => {
      const userBBefore = await User.findOne({
        email: userB.email.toLowerCase(),
      });
      const originalNameB = userBBefore!.name;

      await agentA
        .patch("/api/auth/me")
        .send({ name: "A New Name" });

      const userBAfter = await User.findOne({
        email: userB.email.toLowerCase(),
      });
      expect(userBAfter!.name).toBe(originalNameB);
    });

    it("each user maintains independent identity", async () => {
      const resA = await agentA.get("/api/auth/me");
      const resB = await agentB.get("/api/auth/me");

      expect(resA.body.data.id).not.toBe(resB.body.data.id);
      expect(resA.body.data.email).not.toBe(resB.body.data.email);
    });
  });
});
