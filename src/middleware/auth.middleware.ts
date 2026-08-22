import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { ApiError } from "../utils/api-error";

export const AUTH_COOKIE_NAME = "token";

export interface AuthenticatedUser {
  id: string;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthenticatedUser;
  }
}

export function signToken(payload: { userId: string }): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
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

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];
    if (!token) {
      throw ApiError.unauthorized();
    }

    const payload = jwt.verify(token, env.JWT_SECRET);
    if (
      typeof payload !== "object" ||
      payload === null ||
      typeof (payload as { userId?: unknown }).userId !== "string"
    ) {
      throw ApiError.unauthorized("Invalid authentication token");
    }

    req.user = { id: (payload as { userId: string }).userId };
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }
    next(ApiError.unauthorized("Invalid authentication token"));
  }
}
