import { z } from "zod";
import { GAME_STATUSES } from "../models/user-game";

const statusEnum = z.enum(GAME_STATUSES);

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "must be a valid id");

const gameMetadataBase = {
  cover: z.string().trim().max(2048).optional(),
  genres: z.array(z.string().trim().min(1)).max(50).optional(),
  platforms: z.array(z.string().trim().min(1)).max(50).optional(),
  developers: z.array(z.string().trim().min(1)).max(50).optional(),
  publishers: z.array(z.string().trim().min(1)).max(50).optional(),
  summary: z.string().trim().max(20000).optional(),
};

const personalFieldsBase = {
  status: statusEnum.optional(),
  hoursPlayed: z.number().min(0).max(100000).optional(),
  timesFinished: z.number().int().min(0).max(10000).optional(),
};

export const createGameSchema = z
  .object({
    gameId: objectId.optional(),
    game: z
      .object({
        name: z.string().trim().min(1).max(255),
        ...gameMetadataBase,
        releaseDate: z.coerce.date().optional(),
      })
      .optional(),
    ...personalFieldsBase,
    rating: z.number().min(0).max(10).optional(),
    review: z.string().trim().max(20000).optional(),
  })
  .refine((data) => data.gameId !== undefined || data.game !== undefined, {
    message: "either gameId or game metadata is required",
  });

export const updateGameSchema = z
  .object({
    game: z
      .object({
        name: z.string().trim().min(1).max(255).optional(),
        ...gameMetadataBase,
        releaseDate: z.coerce.date().nullable().optional(),
      })
      .optional(),
    ...personalFieldsBase,
    rating: z.number().min(0).max(10).nullable().optional(),
    review: z.string().trim().max(20000).nullable().optional(),
  })
  .refine(
    (data) =>
      Object.keys(data).length > 0 &&
      (data.game === undefined || Object.keys(data.game).length > 0),
    { message: "at least one field is required" },
  );

const numberRange = (min: number, max: number) => z.coerce.number().min(min).max(max);

const listQueryBase = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(255).optional(),
  listId: objectId.optional(),
  genre: z.string().trim().max(100).optional(),
  platform: z.string().trim().max(100).optional(),
  developer: z.string().trim().max(200).optional(),
  publisher: z.string().trim().max(200).optional(),
  hoursPlayedMin: numberRange(0, 100000).optional(),
  hoursPlayedMax: numberRange(0, 100000).optional(),
  timesFinishedMin: numberRange(0, 10000).optional(),
  timesFinishedMax: numberRange(0, 10000).optional(),
  ratingMin: numberRange(0, 10).optional(),
  ratingMax: numberRange(0, 10).optional(),
};

export const listGamesQuerySchema = z.object({
  ...listQueryBase,
  releaseDateFrom: z.coerce.date().optional(),
  releaseDateTo: z.coerce.date().optional(),
});

export const gameIdParamSchema = z.object({ gameId: objectId });

export type CreateGameInput = z.infer<typeof createGameSchema>;
export type UpdateGameInput = z.infer<typeof updateGameSchema>;
export type ListGamesQuery = z.infer<typeof listGamesQuerySchema>;
