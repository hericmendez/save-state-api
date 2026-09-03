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

beforeAll(startMongo);
afterAll(stopMongo);

describe("POST /api/auth/change-password", () => {
  beforeAll(async () => {
    await register(userA);
    await register(userB);
  });

  describe("Happy path", () => {
    it("authenticated user can change password", async () => {
      const agent = request.agent(getApp());
      await agent.post("/api/auth/login").send({
        email: userA.email,
        password: userA.password,
      });

      const res = await agent
        .post("/api/auth/change-password")
        .send({
          currentPassword: userA.password,
          newPassword: "new-password-123",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe("Password changed successfully");
    });

    it("new password is persisted as hash in the database", async () => {
      const user = await User.findOne({ email: userA.email.toLowerCase() });
      expect(user!.passwordHash).not.toBe("new-password-123");
      expect(user!.passwordHash).toMatch(/^\$2[aby]?\$\d{1,2}\$/);
    });

    it("login with new password works", async () => {
      const res = await request(getApp())
        .post("/api/auth/login")
        .send({ email: userA.email, password: "new-password-123" });

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(userA.email);
    });

    it("old password no longer works", async () => {
      const res = await request(getApp())
        .post("/api/auth/login")
        .send({ email: userA.email, password: userA.password });

      expect(res.status).toBe(401);
    });

    it("response does not contain passwordHash", async () => {
      const agent = request.agent(getApp());
      await agent.post("/api/auth/login").send({
        email: userA.email,
        password: "new-password-123",
      });

      const res = await agent
        .post("/api/auth/change-password")
        .send({
          currentPassword: "new-password-123",
          newPassword: "another-password-123",
        });

      expect(res.status).toBe(200);
      expect(res.body.data).not.toHaveProperty("passwordHash");
      expect(res.body.data).not.toHaveProperty("password");
      expect(res.body.data).not.toHaveProperty("currentPassword");
    });
  });

  describe("Authentication", () => {
    it("rejects request without authentication", async () => {
      const res = await request(getApp())
        .post("/api/auth/change-password")
        .send({
          currentPassword: userA.password,
          newPassword: "new-password-123",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
    });

    it("rejects request with invalid JWT", async () => {
      const res = await request(getApp())
        .post("/api/auth/change-password")
        .set("Cookie", "token=invalid.jwt.token")
        .send({
          currentPassword: userA.password,
          newPassword: "new-password-123",
        });

      expect(res.status).toBe(401);
    });
  });

  describe("Current password validation", () => {
    let agent: request.Agent;

    beforeAll(async () => {
      agent = request.agent(getApp());
      await agent.post("/api/auth/login").send({
        email: userA.email,
        password: "another-password-123",
      });
    });

    it("rejects incorrect current password", async () => {
      const res = await agent
        .post("/api/auth/change-password")
        .send({
          currentPassword: "wrong-current-password",
          newPassword: "new-password-456",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_PASSWORD");
    });

    it("rejects missing currentPassword field", async () => {
      const res = await agent
        .post("/api/auth/change-password")
        .send({ newPassword: "new-password-456" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects empty currentPassword", async () => {
      const res = await agent
        .post("/api/auth/change-password")
        .send({ currentPassword: "", newPassword: "new-password-456" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects non-string currentPassword", async () => {
      const res = await agent
        .post("/api/auth/change-password")
        .send({ currentPassword: 123, newPassword: "new-password-456" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("New password validation", () => {
    let agent: request.Agent;

    beforeAll(async () => {
      agent = request.agent(getApp());
      await agent.post("/api/auth/login").send({
        email: userA.email,
        password: "another-password-123",
      });
    });

    it("rejects newPassword below minimum length", async () => {
      const res = await agent
        .post("/api/auth/change-password")
        .send({
          currentPassword: "another-password-123",
          newPassword: "short",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects newPassword above maximum length", async () => {
      const res = await agent
        .post("/api/auth/change-password")
        .send({
          currentPassword: "another-password-123",
          newPassword: "a".repeat(129),
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects missing newPassword field", async () => {
      const res = await agent
        .post("/api/auth/change-password")
        .send({ currentPassword: "another-password-123" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects empty newPassword", async () => {
      const res = await agent
        .post("/api/auth/change-password")
        .send({ currentPassword: "another-password-123", newPassword: "" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects non-string newPassword", async () => {
      const res = await agent
        .post("/api/auth/change-password")
        .send({ currentPassword: "another-password-123", newPassword: 123 });

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
        password: "another-password-123",
      });

      agentB = request.agent(getApp());
      await agentB.post("/api/auth/login").send({
        email: userB.email,
        password: userB.password,
      });
    });

    it("rejects userId in body", async () => {
      const res = await agentA
        .post("/api/auth/change-password")
        .send({
          userId: "some-id",
          currentPassword: "another-password-123",
          newPassword: "new-password-789",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects email in body", async () => {
      const res = await agentA
        .post("/api/auth/change-password")
        .send({
          currentPassword: "another-password-123",
          newPassword: "new-password-789",
          email: "hacked@test.com",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects passwordHash in body", async () => {
      const res = await agentA
        .post("/api/auth/change-password")
        .send({
          currentPassword: "another-password-123",
          newPassword: "new-password-789",
          passwordHash: "fake-hash",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("response does not contain any password or hash", async () => {
      const res = await agentA
        .post("/api/auth/change-password")
        .send({
          currentPassword: "another-password-123",
          newPassword: "final-password-123",
        });

      expect(res.status).toBe(200);
      const responseStr = JSON.stringify(res.body);
      expect(responseStr).not.toContain("passwordHash");
      expect(responseStr).not.toContain("currentPassword");
      expect(responseStr).not.toContain("newPassword");
    });

    it("plaintext password is never stored in database", async () => {
      const user = await User.findOne({ email: userA.email.toLowerCase() });
      expect(user!.passwordHash).not.toContain("password");
      expect(user!.passwordHash).not.toContain("Password");
      expect(user!.passwordHash).toMatch(/^\$2[aby]?\$\d{1,2}\$/);
    });

    it("user A changing password does not affect user B", async () => {
      const userBBefore = await User.findOne({
        email: userB.email.toLowerCase(),
      });
      const originalHashB = userBBefore!.passwordHash;

      await agentA.post("/api/auth/login").send({
        email: userA.email,
        password: "final-password-123",
      });

      const res = await agentA
        .post("/api/auth/change-password")
        .send({
          currentPassword: "final-password-123",
          newPassword: "very-final-password-123",
        });

      expect(res.status).toBe(200);

      const userBAfter = await User.findOne({
        email: userB.email.toLowerCase(),
      });
      expect(userBAfter!.passwordHash).toBe(originalHashB);
    });

    it("user B can still login with original password", async () => {
      const res = await request(getApp())
        .post("/api/auth/login")
        .send({ email: userB.email, password: userB.password });

      expect(res.status).toBe(200);
    });
  });

  describe("Same password", () => {
    it("rejects newPassword identical to currentPassword", async () => {
      const agent = request.agent(getApp());
      await agent.post("/api/auth/login").send({
        email: userA.email,
        password: "very-final-password-123",
      });

      const res = await agent
        .post("/api/auth/change-password")
        .send({
          currentPassword: "very-final-password-123",
          newPassword: "very-final-password-123",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
