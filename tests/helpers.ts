process.env.JWT_SECRET ??= "test-secret-test-secret-test-secret-1234";
process.env.NODE_ENV ??= "test";
process.env.MONGODB_URI ??= "mongodb://localhost:27017/save-state-test";

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import type { Application } from "express";
import request from "supertest";
import { createApp } from "../src/app";

let mongoServer: MongoMemoryServer;

export async function startMongo(): Promise<void> {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}

export async function stopMongo(): Promise<void> {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
}

export function getApp(): Application {
  return createApp();
}

export interface TestUser {
  email: string;
  password: string;
  name: string;
}

export const userA: TestUser = {
  name: "User A",
  email: "user-a@test.com",
  password: "password-a-123",
};

export const userB: TestUser = {
  name: "User B",
  email: "user-b@test.com",
  password: "password-b-123",
};

export async function register(
  user: TestUser,
): Promise<request.Response> {
  return request(getApp())
    .post("/api/auth/register")
    .send({ name: user.name, email: user.email, password: user.password });
}

export function login(user: TestUser): request.Test {
  return request(getApp())
    .post("/api/auth/login")
    .send({ email: user.email, password: user.password });
}

export async function createGame(
  overrides: Record<string, unknown> = {},
): Promise<request.Response> {
  return request(getApp())
    .post("/api/games")
    .send({
      game: {
        name: "Test Game",
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
      ...overrides,
    });
}
