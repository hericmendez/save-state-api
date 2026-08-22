import { z } from "zod";
import { listGamesQuerySchema } from "./game.schema";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "must be a valid id");

export const createGameListSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const updateGameListSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
  })
  .strict();

export const listGameListsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(255).optional(),
  withCount: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export const listIdParamSchema = z.object({ listId: objectId });

export const gameIdAndListIdParamSchema = z.object({
  gameId: objectId,
  listId: objectId,
});

export const listGamesInListQuerySchema = listGamesQuerySchema.omit({
  listId: true,
});

export type CreateGameListInput = z.infer<typeof createGameListSchema>;
export type UpdateGameListInput = z.infer<typeof updateGameListSchema>;
export type ListGameListsQuery = z.infer<typeof listGameListsQuerySchema>;
export type ListGamesInListQuery = z.infer<typeof listGamesInListQuerySchema>;
