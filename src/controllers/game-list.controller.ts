import type { Request, Response, NextFunction } from "express";
import type { z } from "zod";
import {
  addListToGame,
  createGameList,
  deleteGameList,
  getGameList,
  listGameLists,
  listGamesInList,
  removeListFromGame,
  updateGameList,
} from "../services/game-list.service";
import { ApiError } from "../utils/api-error";
import {
  gameIdAndListIdParamSchema,
  listIdParamSchema,
  type CreateGameListInput,
  type ListGameListsQuery,
  type ListGamesInListQuery,
  type UpdateGameListInput,
} from "../schemas/game-list.schema";

type ListIdParams = z.infer<typeof listIdParamSchema>;
type GameAndListParams = z.infer<typeof gameIdAndListIdParamSchema>;

function requireUserId(req: Request): string {
  if (!req.user) throw ApiError.unauthorized();
  return req.user.id;
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await listGameLists(
      requireUserId(req),
      req.query as unknown as ListGameListsQuery,
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as CreateGameListInput;
    const list = await createGameList(requireUserId(req), body);
    res.status(201).json({ data: list });
  } catch (error) {
    next(error);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const { listId } = req.params as ListIdParams;
    const list = await getGameList(requireUserId(req), listId);
    res.status(200).json({ data: list });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { listId } = req.params as ListIdParams;
    const body = req.body as UpdateGameListInput;
    const list = await updateGameList(requireUserId(req), listId, body);
    res.status(200).json({ data: list });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const { listId } = req.params as ListIdParams;
    await deleteGameList(requireUserId(req), listId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function listGames(req: Request, res: Response, next: NextFunction) {
  try {
    const { listId } = req.params as ListIdParams;
    const query = req.query as unknown as ListGamesInListQuery;
    const result = await listGamesInList(requireUserId(req), listId, query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function addGame(req: Request, res: Response, next: NextFunction) {
  try {
    const { gameId, listId } = req.params as GameAndListParams;
    await addListToGame(requireUserId(req), gameId, listId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function removeGame(req: Request, res: Response, next: NextFunction) {
  try {
    const { gameId, listId } = req.params as GameAndListParams;
    await removeListFromGame(requireUserId(req), gameId, listId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
