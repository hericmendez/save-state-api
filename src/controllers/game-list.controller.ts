import type { Request, Response, NextFunction } from "express";
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

type ListQuery = {
  page: number;
  limit: number;
  search?: string;
  withCount: boolean;
};

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const result = await listGameLists(req.user.id, req.query as unknown as ListQuery);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const list = await createGameList(req.user.id, req.body as { name: string });
    res.status(201).json({ data: list });
  } catch (error) {
    next(error);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { listId } = req.params as unknown as { listId: string };
    const list = await getGameList(req.user.id, listId);
    res.status(200).json({ data: list });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { listId } = req.params as unknown as { listId: string };
    const list = await updateGameList(
      req.user.id,
      listId,
      req.body as { name: string },
    );
    res.status(200).json({ data: list });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { listId } = req.params as unknown as { listId: string };
    await deleteGameList(req.user.id, listId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function listGames(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { listId } = req.params as unknown as { listId: string };
    const query = req.query as unknown as Omit<
      Parameters<typeof listGamesInList>[2],
      never
    >;
    const result = await listGamesInList(req.user.id, listId, query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function addGame(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { gameId, listId } = req.params as unknown as {
      gameId: string;
      listId: string;
    };
    await addListToGame(req.user.id, gameId, listId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function removeGame(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { gameId, listId } = req.params as unknown as {
      gameId: string;
      listId: string;
    };
    await removeListFromGame(req.user.id, gameId, listId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
