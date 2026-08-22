import type { Request, Response, NextFunction } from "express";
import {
  createGame,
  deleteGame,
  getGame,
  listGames,
  updateGame,
} from "../services/game.service";
import { ApiError } from "../utils/api-error";

type GameRequestBody = {
  gameId?: string;
  game?: Record<string, unknown>;
  status?: string;
  hoursPlayed?: number;
  timesFinished?: number;
  rating?: number;
  review?: string;
};

type ListGamesQuery = {
  page: number;
  limit: number;
  search?: string;
  listId?: string;
  genre?: string;
  platform?: string;
  developer?: string;
  publisher?: string;
  releaseDateFrom?: Date;
  releaseDateTo?: Date;
  hoursPlayedMin?: number;
  hoursPlayedMax?: number;
  timesFinishedMin?: number;
  timesFinishedMax?: number;
  ratingMin?: number;
  ratingMax?: number;
};

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const query = req.query as unknown as ListGamesQuery;
    const result = await listGames(req.user.id, query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const body = req.body as GameRequestBody;
    const result = await createGame({
      userId: req.user.id,
      gameId: body.gameId,
      game: body.game as never,
      status: body.status,
      hoursPlayed: body.hoursPlayed,
      timesFinished: body.timesFinished,
      rating: body.rating,
      review: body.review,
    });
    res.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { gameId } = req.params as unknown as { gameId: string };
    const result = await getGame(req.user.id, gameId);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { gameId } = req.params as unknown as { gameId: string };
    const result = await updateGame(
      req.user.id,
      gameId,
      req.body as Parameters<typeof updateGame>[2],
    );
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { gameId } = req.params as unknown as { gameId: string };
    await deleteGame(req.user.id, gameId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
