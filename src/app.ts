import express from "express";
import cookieParser from "cookie-parser";
import { ApiError } from "./utils/api-error";
import { errorMiddleware } from "./middleware/error.middleware";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use((_req, _res, next) => {
    next(ApiError.notFound("ROUTE_NOT_FOUND", "The requested resource does not exist"));
  });

  app.use(errorMiddleware);

  return app;
}
