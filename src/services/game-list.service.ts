import { Types } from "mongoose";
import { ApiError } from "../utils/api-error";
import { GameList, type GameListDocument } from "../models/game-list";
import { UserGame } from "../models/user-game";
import {
  listGames,
  type PaginatedUserGame,
  type GameQuery,
} from "./game.service";
import type {
  ListGameListsQuery,
  ListGamesInListQuery,
} from "../schemas/game-list.schema";
import type { UserGameDocument } from "../models/user-game";

async function findOwnedListOrThrow(
  userId: string,
  listId: string,
): Promise<GameListDocument> {
  try {
    const list = await GameList.findOne({
      _id: listId,
      userId: new Types.ObjectId(userId),
    });
    if (!list) throw ApiError.notFound("LIST_NOT_FOUND", "Game list not found");
    return list;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest("INVALID_LIST_ID", "Invalid game list id");
  }
}

export interface PaginatedGameList {
  data: (ReturnType<GameListDocument["toObject"]> & { gameCount?: number })[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export async function listGameLists(
  userId: string,
  filters: ListGameListsQuery,
): Promise<PaginatedGameList> {
  const query: Record<string, unknown> = {
    userId: new Types.ObjectId(userId),
  };
  if (filters.search) {
    const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.name = { $regex: escaped, $options: "i" };
  }

  const [total, lists] = await Promise.all([
    GameList.countDocuments(query),
    GameList.find(query)
      .sort({ name: 1 })
      .skip((filters.page - 1) * filters.limit)
      .limit(filters.limit),
  ]);

  let countsByListId = new Map<string, number>();
  if (filters.withCount && lists.length > 0) {
    const counts = await UserGame.aggregate<{ _id: Types.ObjectId; count: number }>([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          listIds: { $in: lists.map((list) => list._id) },
        },
      },
      { $unwind: "$listIds" },
      { $match: { listIds: { $in: lists.map((list) => list._id) } } },
      { $group: { _id: "$listIds", count: { $sum: 1 } } },
    ]);
    countsByListId = new Map(
      counts.map((entry) => [String(entry._id), entry.count]),
    );
  }

  const totalPages = Math.ceil(total / filters.limit);

  return {
    data: lists.map((list) => ({
      ...list.toObject(),
      ...(filters.withCount
        ? { gameCount: countsByListId.get(String(list._id)) ?? 0 }
        : {}),
    })),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages,
      hasNextPage: filters.page < totalPages,
      hasPreviousPage: filters.page > 1,
    },
  };
}

export async function createGameList(
  userId: string,
  input: { name: string },
): Promise<GameListDocument> {
  const existing = await GameList.findOne({
    userId: new Types.ObjectId(userId),
    name: input.name,
  });
  if (existing) {
    throw ApiError.badRequest("LIST_ALREADY_EXISTS", "A list with this name already exists");
  }
  return GameList.create({ userId, name: input.name });
}

export async function getGameList(
  userId: string,
  listId: string,
): Promise<GameListDocument> {
  return findOwnedListOrThrow(userId, listId);
}

export async function updateGameList(
  userId: string,
  listId: string,
  input: { name: string },
): Promise<GameListDocument> {
  const list = await findOwnedListOrThrow(userId, listId);
  const duplicate = await GameList.findOne({
    userId: new Types.ObjectId(userId),
    name: input.name,
    _id: { $ne: list._id },
  });
  if (duplicate) {
    throw ApiError.badRequest("LIST_ALREADY_EXISTS", "A list with this name already exists");
  }
  list.name = input.name;
  await list.save();
  return list;
}

export async function deleteGameList(userId: string, listId: string): Promise<void> {
  const list = await findOwnedListOrThrow(userId, listId);
  await Promise.all([
    list.deleteOne(),
    UserGame.updateMany(
      { userId: new Types.ObjectId(userId), listIds: list._id },
      { $pull: { listIds: list._id } },
    ),
  ]);
}

export async function listGamesInList(
  userId: string,
  listId: string,
  filters: ListGamesInListQuery,
): Promise<PaginatedUserGame> {
  await findOwnedListOrThrow(userId, listId);
  return listGames(userId, { ...filters, listId });
}

export async function addListToGame(
  userId: string,
  gameId: string,
  listId: string,
): Promise<void> {
  const list = await findOwnedListOrThrow(userId, listId);

  let userGame: UserGameDocument | null;
  try {
    userGame = await UserGame.findOne({
      _id: gameId,
      userId: new Types.ObjectId(userId),
    });
  } catch {
    throw ApiError.badRequest("INVALID_GAME_ID", "Invalid game id");
  }
  if (!userGame) {
    throw ApiError.notFound("GAME_NOT_FOUND", "Game not found");
  }

  const objectId = new Types.ObjectId(listId);
  if (userGame.listIds.some((id) => id.equals(objectId))) {
    return;
  }

  userGame.listIds.push(objectId);
  await userGame.save();
}

export async function removeListFromGame(
  userId: string,
  gameId: string,
  listId: string,
): Promise<void> {
  let userGame: UserGameDocument | null;
  try {
    userGame = await UserGame.findOne({
      _id: gameId,
      userId: new Types.ObjectId(userId),
    });
  } catch {
    throw ApiError.badRequest("INVALID_GAME_ID", "Invalid game id");
  }
  if (!userGame) {
    throw ApiError.notFound("GAME_NOT_FOUND", "Game not found");
  }

  await userGame.updateOne({ $pull: { listIds: new Types.ObjectId(listId) } });
}
