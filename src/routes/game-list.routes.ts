import { Router } from "express";
import {
  addGame,
  create,
  getOne,
  list,
  listGames,
  remove,
  removeGame,
  update,
} from "../controllers/game-list.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import { gameIdAndListIdParamSchema } from "../schemas/game-list.schema";
import {
  createGameListSchema,
  listGamesInListQuerySchema,
  listGameListsQuerySchema,
  listIdParamSchema,
  updateGameListSchema,
} from "../schemas/game-list.schema";

const router = Router();

router.use("/game-lists", requireAuth);

router.get("/game-lists", validate({ query: listGameListsQuerySchema }), list);
router.post("/game-lists", validate({ body: createGameListSchema }), create);
router.get("/game-lists/:listId", validate({ params: listIdParamSchema }), getOne);
router.patch(
  "/game-lists/:listId",
  validate({ body: updateGameListSchema }),
  update,
);
router.delete("/game-lists/:listId", validate({ params: listIdParamSchema }), remove);
router.get(
  "/game-lists/:listId/games",
  validate({ query: listGamesInListQuerySchema }),
  listGames,
);

router.post(
  "/games/:gameId/lists/:listId",
  requireAuth,
  validate({ params: gameIdAndListIdParamSchema }),
  addGame,
);
router.delete(
  "/games/:gameId/lists/:listId",
  requireAuth,
  validate({ params: gameIdAndListIdParamSchema }),
  removeGame,
);

export default router;
