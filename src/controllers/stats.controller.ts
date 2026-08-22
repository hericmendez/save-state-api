import type { Request, Response, NextFunction } from "express";
import { getGameStats } from "../services/stats.service";
import { ApiError } from "../utils/api-error";

export async function stats(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const result = await getGameStats(
      req.user.id,
      req.query as unknown as Parameters<typeof getGameStats>[1],
    );
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}
