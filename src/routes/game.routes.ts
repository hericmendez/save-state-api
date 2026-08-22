import { Router } from "express";
import { stats } from "../controllers/stats.controller";
import {
  create,
  getOne,
  list,
  remove,
  update,
} from "../controllers/game.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import {
  createGameSchema,
  gameIdParamSchema,
  listGamesQuerySchema,
  updateGameSchema,
} from "../schemas/game.schema";

const router = Router();

router.use("/games", requireAuth);

router.get("/games", validate({ query: listGamesQuerySchema }), list);
router.post("/games", validate({ body: createGameSchema }), create);
router.get(
  "/games/stats",
  validate({
    query: listGamesQuerySchema.omit({ page: true, limit: true }),
  }),
  stats,
);
router.get("/games/:gameId", validate({ params: gameIdParamSchema }), getOne);
router.patch("/games/:gameId", validate({ body: updateGameSchema }), update);
router.delete("/games/:gameId", validate({ params: gameIdParamSchema }), remove);

export default router;
