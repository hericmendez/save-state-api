import type { Request, Response, NextFunction } from "express";
import {
  createGame,
  deleteGame,
  getGame,
  listGames,
  updateGame,
} from "../services/game.service";
import { ApiError } from "../utils/api-error";
import { validated } from "../middleware/validation.middleware";
import type {
  CreateGameInput,
  ListGamesQuery,
  UpdateGameInput,
} from "../schemas/game.schema";

function requireUserId(req: Request): string {
  if (!req.user) throw ApiError.unauthorized();
  return req.user.id;
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await listGames(
      requireUserId(req),
      validated<ListGamesQuery>(req, "query"),
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = validated<CreateGameInput>(req, "body");
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
    const { gameId } = validated<{ gameId: string }>(req, "params");
    const result = await getGame(requireUserId(req), gameId);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { gameId } = validated<{ gameId: string }>(req, "params");
    const result = await updateGame(
      requireUserId(req),
      gameId,
      validated<UpdateGameInput>(req, "body"),
    );
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const { gameId } = validated<{ gameId: string }>(req, "params");
    await deleteGame(requireUserId(req), gameId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
