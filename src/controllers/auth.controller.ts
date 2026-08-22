import type { Request, Response, NextFunction } from "express";
import {
  loginUser,
  registerUser,
  getUserById,
  toSafeUser,
} from "../services/auth.service";
import { ApiError } from "../utils/api-error";
import { signToken, setAuthCookie, clearAuthCookie } from "../middleware/auth.middleware";

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await registerUser(req.body);
    res.status(201).json({ data: toSafeUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await loginUser(req.body);
    const token = signToken({ userId: String(user._id) });
    setAuthCookie(res, token);
    res.status(200).json({ data: toSafeUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw ApiError.unauthorized();
    }
    const user = await getUserById(req.user.id);
    if (!user) {
      throw ApiError.notFound("USER_NOT_FOUND", "Authenticated user no longer exists");
    }
    res.status(200).json({ data: toSafeUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function logout(_req: Request, res: Response, next: NextFunction) {
  try {
    clearAuthCookie(res);
    res.status(200).json({ data: { message: "Logged out" } });
  } catch (error) {
    next(error);
  }
}
