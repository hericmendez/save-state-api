import bcrypt from "bcryptjs";
import { User } from "../models/user";
import { ApiError } from "../utils/api-error";

export function toSafeUser(user: {
  _id: unknown;
  name: string;
  email: string;
}) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
  };
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}) {
  const existing = await User.findOne({ email: input.email.toLowerCase() });
  if (existing) {
    throw ApiError.badRequest("EMAIL_ALREADY_IN_USE", "Email is already in use");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await User.create({
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash,
  });

  return user;
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await User.findOne({ email: input.email.toLowerCase() });
  const passwordMatches =
    user !== null && (await bcrypt.compare(input.password, user.passwordHash));

  if (!user || !passwordMatches) {
    throw ApiError.unauthorized("Invalid credentials");
  }

  return user;
}

export async function getUserById(userId: string) {
  return User.findById(userId);
}
