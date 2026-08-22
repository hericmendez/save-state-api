import type { Request, Response, NextFunction } from "express";
import { getGameStats, type GameStatsFilters } from "../services/stats.service";
import { ApiError } from "../utils/api-error";
import { validated } from "../middleware/validation.middleware";

export async function stats(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const result = await getGameStats(
      req.user.id,
      validated<GameStatsFilters>(req, "query"),
    );
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}
