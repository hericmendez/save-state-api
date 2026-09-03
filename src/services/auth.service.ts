import crypto from "crypto";
import bcrypt from "bcryptjs";
import { User } from "../models/user";
import { PasswordResetToken } from "../models/password-reset-token";
import { emailService } from "./email.service";
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

export async function updateUserName(
  userId: string,
  name: string,
) {
  const user = await User.findByIdAndUpdate(
    userId,
    { name },
    { new: true, runValidators: true },
  );
  if (!user) {
    throw ApiError.notFound("USER_NOT_FOUND", "User not found");
  }
  return user;
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound("USER_NOT_FOUND", "User not found");
  }

  const passwordMatches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!passwordMatches) {
    throw ApiError.badRequest("INVALID_PASSWORD", "Current password is incorrect");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await User.findByIdAndUpdate(userId, {
    passwordHash,
    $inc: { sessionVersion: 1 },
  });
}

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await User.findOne({ email: email.toLowerCase() });

  if (user) {
    await PasswordResetToken.deleteMany({ userId: user._id });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    await PasswordResetToken.create({
      tokenHash,
      userId: user._id,
      expiresAt,
    });

    const resetUrl = `http://localhost:1337/reset-password?token=${rawToken}`;
    await emailService.send({
      to: user.email,
      subject: "Password Reset Request",
      text: `You requested a password reset. Use this token to reset your password: ${rawToken}\n\nThis link expires in 1 hour.\n\nIf you did not request this, ignore this email.`,
      html: `<p>You requested a password reset.</p><p>Use this token to reset your password: <strong>${rawToken}</strong></p><p>This link expires in 1 hour.</p><p>If you did not request this, ignore this email.</p>`,
    });
  }
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  const tokenHash = hashToken(token);

  const resetToken = await PasswordResetToken.findOne({
    tokenHash,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!resetToken) {
    throw ApiError.badRequest("INVALID_TOKEN", "Invalid or expired reset token");
  }

  resetToken.used = true;
  await resetToken.save();

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await User.findByIdAndUpdate(resetToken.userId, {
    passwordHash,
    $inc: { sessionVersion: 1 },
  });
}
