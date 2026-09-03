import { Types } from "mongoose";
import { User } from "../models/user";
import { GlobalGame } from "../models/game";
import { UserGame } from "../models/user-game";
import { GameList } from "../models/game-list";
import { ApiError } from "../utils/api-error";

export interface UserExportData {
  exportVersion: number;
  exportedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
    updatedAt: string;
  };
  games: Array<{
    id: string;
    game: {
      id: string;
      name: string;
      slug: string;
      source: string;
      sourceUrl?: string;
      cover?: string;
      genres: string[];
      platforms: string[];
      developers: string[];
      publishers: string[];
      releaseDate?: string;
      summary?: string;
    };
    status: string;
    hoursPlayed: number;
    timesFinished: number;
    rating?: number;
    review?: string;
    listIds: string[];
    createdAt: string;
    updatedAt: string;
  }>;
  lists: Array<{
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export async function buildUserExportData(
  userId: string,
): Promise<UserExportData> {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound("USER_NOT_FOUND", "User not found");
  }

  const userGames = await UserGame.find({ userId: new Types.ObjectId(userId) });

  const globalGameIds = [
    ...new Set(userGames.map((ug) => String(ug.gameId))),
  ];

  let globalGamesMap = new Map<string, InstanceType<typeof GlobalGame>>();
  if (globalGameIds.length > 0) {
    const globalGames = await GlobalGame.find({
      _id: { $in: globalGameIds.map((id) => new Types.ObjectId(id)) },
    });
    globalGamesMap = new Map(
      globalGames.map((gg) => [String(gg._id), gg]),
    );
  }

  const gameLists = await GameList.find({
    userId: new Types.ObjectId(userId),
  });

  const exportData: UserExportData = {
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
    games: userGames.map((ug) => {
      const globalGame = globalGamesMap.get(String(ug.gameId));
      return {
        id: String(ug._id),
        game: globalGame
          ? {
              id: String(globalGame._id),
              name: globalGame.name,
              slug: globalGame.slug,
              source: globalGame.source,
              sourceUrl: globalGame.sourceUrl,
              cover: globalGame.cover,
              genres: globalGame.genres,
              platforms: globalGame.platforms,
              developers: globalGame.developers,
              publishers: globalGame.publishers,
              releaseDate: globalGame.releaseDate?.toISOString(),
              summary: globalGame.summary,
            }
          : {
              id: String(ug.gameId),
              name: "Unknown Game",
              slug: "unknown",
              source: "unknown",
              genres: [],
              platforms: [],
              developers: [],
              publishers: [],
            },
        status: ug.status,
        hoursPlayed: ug.hoursPlayed,
        timesFinished: ug.timesFinished,
        rating: ug.rating,
        review: ug.review,
        listIds: ug.listIds.map((id) => String(id)),
        createdAt: ug.createdAt.toISOString(),
        updatedAt: ug.updatedAt.toISOString(),
      };
    }),
    lists: gameLists.map((gl) => ({
      id: String(gl._id),
      name: gl.name,
      createdAt: gl.createdAt.toISOString(),
      updatedAt: gl.updatedAt.toISOString(),
    })),
  };

  return exportData;
}

function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r") ||
    str.includes(";")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function serializeArray(arr: string[]): string {
  if (arr.length === 0) return "";
  return arr.join("; ");
}

export const CSV_HEADERS = [
  "userId",
  "userEmail",
  "userName",
  "userCreatedAt",
  "userUpdatedAt",
  "gameId",
  "globalGameId",
  "gameName",
  "slug",
  "source",
  "sourceUrl",
  "cover",
  "genres",
  "platforms",
  "developers",
  "publishers",
  "releaseDate",
  "summary",
  "status",
  "hoursPlayed",
  "timesFinished",
  "rating",
  "review",
  "listIds",
  "listNames",
  "createdAt",
  "updatedAt",
] as const;

export function exportDataToCsv(data: UserExportData): string {
  const listMap = new Map(data.lists.map((l) => [l.id, l.name]));

  const rows: string[][] = [];

  for (const game of data.games) {
    const listNames = game.listIds
      .map((id) => listMap.get(id) ?? "")
      .filter((n) => n !== "");

    rows.push([
      escapeCsvField(data.user.id),
      escapeCsvField(data.user.email),
      escapeCsvField(data.user.name),
      escapeCsvField(data.user.createdAt),
      escapeCsvField(data.user.updatedAt),
      escapeCsvField(game.id),
      escapeCsvField(game.game.id),
      escapeCsvField(game.game.name),
      escapeCsvField(game.game.slug),
      escapeCsvField(game.game.source),
      escapeCsvField(game.game.sourceUrl ?? ""),
      escapeCsvField(game.game.cover ?? ""),
      escapeCsvField(serializeArray(game.game.genres)),
      escapeCsvField(serializeArray(game.game.platforms)),
      escapeCsvField(serializeArray(game.game.developers)),
      escapeCsvField(serializeArray(game.game.publishers)),
      escapeCsvField(game.game.releaseDate ?? ""),
      escapeCsvField(game.game.summary ?? ""),
      escapeCsvField(game.status),
      escapeCsvField(game.hoursPlayed),
      escapeCsvField(game.timesFinished),
      escapeCsvField(game.rating ?? ""),
      escapeCsvField(game.review ?? ""),
      escapeCsvField(serializeArray(game.listIds)),
      escapeCsvField(serializeArray(listNames)),
      escapeCsvField(game.createdAt),
      escapeCsvField(game.updatedAt),
    ]);
  }

  const headerLine = CSV_HEADERS.join(",");
  const dataLines = rows.map((row) => row.join(","));

  return [headerLine, ...dataLines].join("\n");
}
