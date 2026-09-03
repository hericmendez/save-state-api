import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { ApiError } from "../utils/api-error";
import { User } from "../models/user";

export const AUTH_COOKIE_NAME = "token";

export interface AuthenticatedUser {
  id: string;
}

export interface JwtPayload {
  userId: string;
  sessionVersion: number;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthenticatedUser;
  }
}

export function signToken(payload: { userId: string; sessionVersion: number }): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

const MS_PER_UNIT: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

function parseExpiresToMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  return Number(match[1]) * MS_PER_UNIT[match[2]];
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: env.NODE_ENV === "production",
    maxAge: parseExpiresToMs(env.JWT_EXPIRES_IN),
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: env.NODE_ENV === "production",
  });
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];
    if (!token) {
      throw ApiError.unauthorized();
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded !== "object" || decoded === null) {
      throw ApiError.unauthorized("Invalid authentication token");
    }

    const payload = decoded as Record<string, unknown>;

    if (typeof payload.userId !== "string") {
      throw ApiError.unauthorized("Invalid authentication token");
    }

    if (
      typeof payload.sessionVersion !== "number" ||
      !Number.isInteger(payload.sessionVersion) ||
      payload.sessionVersion < 0
    ) {
      throw ApiError.unauthorized("Invalid authentication token");
    }

    const user = await User.findById(payload.userId).select("sessionVersion").lean();
    if (!user) {
      throw ApiError.unauthorized("Invalid authentication token");
    }

    const currentVersion = user.sessionVersion ?? 0;
    if (currentVersion !== payload.sessionVersion) {
      throw ApiError.unauthorized("Invalid authentication token");
    }

    req.user = { id: payload.userId };
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }
    next(ApiError.unauthorized("Invalid authentication token"));
  }
}
