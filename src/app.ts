import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import gameRoutes from "./routes/game.routes";
import gameListRoutes from "./routes/game-list.routes";
import { ApiError } from "./utils/api-error";
import { errorMiddleware } from "./middleware/error.middleware";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: "http://localhost:5173",
      credentials: true,
    }),
  );

  app.use(express.json());
  app.use(cookieParser());

  app.use("/api", authRoutes);
  app.use("/api", gameRoutes);
  app.use("/api", gameListRoutes);

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use((_req, _res, next) => {
    next(ApiError.notFound("ROUTE_NOT_FOUND", "The requested resource does not exist"));
  });

  app.use(errorMiddleware);

  return app;
}
