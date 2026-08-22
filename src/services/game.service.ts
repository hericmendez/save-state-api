import type { FilterQuery } from "mongoose";
import { Types } from "mongoose";
import slugify from "slugify";
import { ApiError } from "../utils/api-error";
import { GlobalGame, type GlobalGameDocument } from "../models/game";
import { UserGame, type UserGameDocument } from "../models/user-game";

type ListGamesFilters = {
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

export interface PaginatedUserGame {
  data: (ReturnType<UserGameDocument["toObject"]> & {
    game: GlobalGameDocument | null;
  })[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

function buildFilters(
  userId: string,
  filters: ListGamesFilters,
): FilterQuery<UserGameDocument> {
  const query: FilterQuery<UserGameDocument> = {
    userId: new Types.ObjectId(userId),
  };

  if (filters.listId) {
    query.listIds = new Types.ObjectId(filters.listId);
  }
  if (filters.hoursPlayedMin !== undefined || filters.hoursPlayedMax !== undefined) {
    query.hoursPlayed = {};
    if (filters.hoursPlayedMin !== undefined) {
      query.hoursPlayed.$gte = filters.hoursPlayedMin;
    }
    if (filters.hoursPlayedMax !== undefined) {
      query.hoursPlayed.$lte = filters.hoursPlayedMax;
    }
  }
  if (
    filters.timesFinishedMin !== undefined ||
    filters.timesFinishedMax !== undefined
  ) {
    query.timesFinished = {};
    if (filters.timesFinishedMin !== undefined) {
      query.timesFinished.$gte = filters.timesFinishedMin;
    }
    if (filters.timesFinishedMax !== undefined) {
      query.timesFinished.$lte = filters.timesFinishedMax;
    }
  }
  if (filters.ratingMin !== undefined || filters.ratingMax !== undefined) {
    query.rating = {};
    if (filters.ratingMin !== undefined) {
      query.rating.$gte = filters.ratingMin;
    }
    if (filters.ratingMax !== undefined) {
      query.rating.$lte = filters.ratingMax;
    }
  }

  return query;
}

function buildGlobalGameFilters(
  filters: ListGamesFilters,
): FilterQuery<GlobalGameDocument> {
  const query: FilterQuery<GlobalGameDocument> = {};

  if (filters.search) {
    const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.name = { $regex: escaped, $options: "i" };
  }
  for (const field of ["genre", "platform", "developer", "publisher"] as const) {
    const value = filters[field];
    if (value !== undefined) {
      const plural = `${field}s` as
        | "genres"
        | "platforms"
        | "developers"
        | "publishers";
      const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query[plural] = { $regex: `^${escaped}$`, $options: "i" };
    }
  }
  if (filters.releaseDateFrom !== undefined || filters.releaseDateTo !== undefined) {
    query.releaseDate = {};
    if (filters.releaseDateFrom !== undefined) {
      query.releaseDate.$gte = filters.releaseDateFrom;
    }
    if (filters.releaseDateTo !== undefined) {
      query.releaseDate.$lte = filters.releaseDateTo;
    }
  }

  return query;
}

async function findOwnedUserGameOrThrow(
  userId: string,
  gameId: string,
): Promise<UserGameDocument> {
  let userGame: UserGameDocument | null = null;
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
  return userGame;
}

export async function listGames(
  userId: string,
  filters: ListGamesFilters,
): Promise<PaginatedUserGame> {
  const globalFilter = buildGlobalGameFilters(filters);
  let matchingGameIds: Types.ObjectId[] | null = null;

  if (Object.keys(globalFilter).length > 0) {
    const games = await GlobalGame.find(globalFilter).select("_id");
    matchingGameIds = games.map((game) => game._id as Types.ObjectId);
  }

  const query = buildFilters(userId, filters);
  if (matchingGameIds) {
    query.gameId = { $in: matchingGameIds };
  }

  const [total, userGames] = await Promise.all([
    UserGame.countDocuments(query),
    UserGame.find(query)
      .sort({ updatedAt: -1 })
      .skip((filters.page - 1) * filters.limit)
      .limit(filters.limit)
      .populate("gameId"),
  ]);

  const totalPages = Math.ceil(total / filters.limit);

  return {
    data: userGames.map((userGame) => ({
      ...userGame.toObject(),
      game: (userGame.gameId as unknown as GlobalGameDocument) ?? null,
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

export async function getGame(
  userId: string,
  gameId: string,
): Promise<UserGameDocument & { game: GlobalGameDocument }> {
  const userGame = await findOwnedUserGameOrThrow(userId, gameId);
  const game = await GlobalGame.findById(userGame.gameId);
  if (!game) {
    throw ApiError.notFound("GAME_NOT_FOUND", "Game not found");
  }
  return { ...userGame.toObject(), game } as UserGameDocument & {
    game: GlobalGameDocument;
  };
}

export async function createGame(input: {
  userId: string;
  gameId?: string;
  game?: {
    name: string;
    cover?: string;
    genres?: string[];
    platforms?: string[];
    developers?: string[];
    publishers?: string[];
    releaseDate?: Date;
    summary?: string;
  };
  status?: string;
  hoursPlayed?: number;
  timesFinished?: number;
  rating?: number;
  review?: string;
}): Promise<UserGameDocument & { game: GlobalGameDocument }> {
  let globalGame: GlobalGameDocument | null;

  if (input.gameId) {
    globalGame = await GlobalGame.findById(input.gameId);
    if (!globalGame) {
      throw ApiError.badRequest("GAME_NOT_FOUND", "Referenced game does not exist");
    }
  } else if (input.game) {
    const existing = await GlobalGame.findOne({
      name: input.game.name,
      source: "manual",
    });
    globalGame =
      existing ??
      (await GlobalGame.create({
        slug: `${slugify(input.game.name, { lower: true, strict: true })}-${Date.now()}`,
        name: input.game.name,
        source: "manual",
        cover: input.game.cover,
        genres: input.game.genres ?? [],
        platforms: input.game.platforms ?? [],
        developers: input.game.developers ?? [],
        publishers: input.game.publishers ?? [],
        releaseDate: input.game.releaseDate,
        summary: input.game.summary,
      }));
  } else {
    throw ApiError.badRequest("VALIDATION_ERROR", "Either gameId or game is required");
  }

  let userGame: UserGameDocument;
  try {
    userGame = await UserGame.create({
      userId: input.userId,
      gameId: globalGame._id,
      status: input.status,
      hoursPlayed: input.hoursPlayed,
      timesFinished: input.timesFinished,
      rating: input.rating,
      review: input.review,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      (error as { code?: number }).code === 11000
    ) {
      throw ApiError.badRequest(
        "GAME_ALREADY_IN_LIBRARY",
        "This game is already in your library",
      );
    }
    throw error;
  }

  return { ...userGame.toObject(), game: globalGame } as UserGameDocument & {
    game: GlobalGameDocument;
  };
}

export async function updateGame(
  userId: string,
  gameId: string,
  input: {
    game?: {
      name?: string;
      cover?: string;
      genres?: string[];
      platforms?: string[];
      developers?: string[];
      publishers?: string[];
      releaseDate?: Date | null;
      summary?: string;
    };
    status?: string;
    hoursPlayed?: number;
    timesFinished?: number;
    rating?: number | null;
    review?: string | null;
  },
): Promise<UserGameDocument & { game: GlobalGameDocument }> {
  const userGame = await findOwnedUserGameOrThrow(userId, gameId);

  const personalUpdates: Partial<UserGameDocument> = {};
  for (const field of [
    "status",
    "hoursPlayed",
    "timesFinished",
    "rating",
    "review",
  ] as const) {
    if (input[field] !== undefined) {
      (personalUpdates as Record<string, unknown>)[field] = input[field];
    }
  }
  Object.assign(userGame, personalUpdates);
  await userGame.save();

  if (input.game && Object.keys(input.game).length > 0) {
    const globalGame = await GlobalGame.findById(userGame.gameId);
    if (!globalGame || globalGame.source !== "manual") {
      throw ApiError.badRequest(
        "GAME_METADATA_IMMUTABLE",
        "Metadata can only be edited on manually created games",
      );
    }
    for (const [field, value] of Object.entries(input.game)) {
      if (value === undefined) continue;
      (globalGame as unknown as Record<string, unknown>)[field] = value;
    }
    await globalGame.save();
  }

  const game = await GlobalGame.findById(userGame.gameId);
  return { ...userGame.toObject(), game: game! } as UserGameDocument & {
    game: GlobalGameDocument;
  };
}

export async function deleteGame(userId: string, gameId: string): Promise<void> {
  const userGame = await findOwnedUserGameOrThrow(userId, gameId);
  await userGame.deleteOne();
}
