import mongoose, { Schema, Types } from "mongoose";

export const GAME_STATUSES = [
  "backlog",
  "playing",
  "replaying",
  "stalled",
  "dropped",
  "limbo",
  "endless",
  "achievement",
  "finished",
  "wishlist",
] as const;

export type GameStatus = (typeof GAME_STATUSES)[number];

const UserGameSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    gameId: {
      type: Schema.Types.ObjectId,
      ref: "GlobalGame",
      required: true,
      index: true,
    },
    status: { type: String, enum: GAME_STATUSES, default: "backlog" },
    hoursPlayed: { type: Number, default: 0, min: 0 },
    timesFinished: { type: Number, default: 0, min: 0 },
    rating: { type: Number, min: 0, max: 10 },
    review: { type: String, trim: true },
    listIds: [{ type: Schema.Types.ObjectId, ref: "GameList" }],
  },
  { timestamps: true },
);

UserGameSchema.index({ userId: 1, gameId: 1 }, { unique: true });

export interface UserGameDocument extends mongoose.Document {
  userId: Types.ObjectId;
  gameId: Types.ObjectId;
  status: GameStatus;
  hoursPlayed: number;
  timesFinished: number;
  rating?: number;
  review?: string;
  listIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export const UserGame = mongoose.model<UserGameDocument>(
  "UserGame",
  UserGameSchema,
);
