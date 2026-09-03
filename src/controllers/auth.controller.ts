import type { Request, Response, NextFunction } from "express";
import {
  loginUser,
  registerUser,
  getUserById,
  toSafeUser,
  forgotPassword,
  resetPassword,
  updateUserName,
  changePassword,
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
    const token = signToken({
      userId: String(user._id),
      sessionVersion: user.sessionVersion,
    });
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

export async function forgotPasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    await forgotPassword(email);
    res.status(200).json({
      data: { message: "If an account exists, a reset email has been sent" },
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = req.body;
    await resetPassword(token, password);
    res.status(200).json({ data: { message: "Password has been reset" } });
  } catch (error) {
    next(error);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw ApiError.unauthorized();
    }
    const { name } = req.body;
    const user = await updateUserName(req.user.id, name);
    res.status(200).json({ data: toSafeUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function changePasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw ApiError.unauthorized();
    }
    const { currentPassword, newPassword } = req.body;
    await changePassword(req.user.id, currentPassword, newPassword);
    res.status(200).json({ data: { message: "Password changed successfully" } });
  } catch (error) {
    next(error);
  }
}
