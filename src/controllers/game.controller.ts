import type { Request, Response, NextFunction } from "express";
import {
  createGame,
  deleteGame,
  getGame,
  listGames,
  updateGame,
  type ListGamesFilters,
  type CreateGameData,
  type UpdateGameData,
} from "../services/game.service";
import { ApiError } from "../utils/api-error";
import type {
  CreateGameInput,
  ListGamesQuery,
  UpdateGameInput,
} from "../schemas/game.schema";
import type { gameIdParamSchema } from "../schemas/game.schema";
import type { z } from "zod";

type GameIdParams = z.infer<typeof gameIdParamSchema>;

function requireUserId(req: Request): string {
  if (!req.user) throw ApiError.unauthorized();
  return req.user.id;
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await listGames(
      requireUserId(req),
      req.query as unknown as ListGamesQuery,
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as CreateGameInput;
    const result = await createGame({
      userId: requireUserId(req),
      ...body,
    });
    res.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const { gameId } = req.params as GameIdParams;
    const result = await getGame(requireUserId(req), gameId);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { gameId } = req.params as GameIdParams;
    const result = await updateGame(
      requireUserId(req),
      gameId,
      req.body as UpdateGameInput,
    );
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const { gameId } = req.params as GameIdParams;
    await deleteGame(requireUserId(req), gameId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
