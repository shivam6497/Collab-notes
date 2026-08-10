import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { prisma } from "../lib/prisma.js";
import { pubClient } from "../lib/redis.js";

dotenv.config();

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET!;
const ACCESS_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY ?? "15m";
const REFRESH_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY ?? "7d";

export interface TokenPayload {
  userId: string;
  email: string;
}

/** Redis TTL for refresh tokens, kept in sync with `REFRESH_EXPIRY`. */
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60;

/** Signs and returns a short-lived JWT access token. */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRY,
  } as jwt.SignOptions);
}

/** Signs and returns a long-lived JWT refresh token. */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRY,
  } as jwt.SignOptions);
}

/**
 * Verifies an access token and returns the decoded payload.
 * Throws a `JsonWebTokenError` if the token is invalid or expired.
 */
export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
}

/**
 * Verifies a refresh token and returns the decoded payload.
 * Throws a `JsonWebTokenError` if the token is invalid or expired.
 */
export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
}

/**
 * Creates a new user account. Throws `"EMAIL_TAKEN"` if the email is already
 * registered.
 */
export async function registerUser(email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("EMAIL_TAKEN");

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hashedPassword },
    select: { id: true, email: true, createdAt: true },
  });
  return user;
}

/**
 * Validates credentials and returns the matching user record.
 * Throws `"INVALID_CREDENTIALS"` for an unknown email or wrong password.
 */
export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("INVALID_CREDENTIALS");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error("INVALID_CREDENTIALS");

  return {
    id: user.id,
    email: user.email,
  };
}

/** Persists a refresh token in Redis with a TTL matching its JWT expiry. */
export async function saveRefreshToken(userId: string, token: string) {
  await pubClient.setex(`refresh:${token}`, REFRESH_TOKEN_TTL, userId);
}

/** Removes a refresh token from Redis, effectively revoking it. */
export async function deleteRefreshToken(token: string) {
  await pubClient.del(`refresh:${token}`);
}

/**
 * Looks up the refresh token in Redis and returns the associated user.
 * Throws `"INVALID_TOKEN"` if the token does not exist or the user is deleted.
 */
export async function validateRefreshToken(token: string) {
  const userId = await pubClient.get(`refresh:${token}`);

  if (!userId) throw new Error("INVALID_TOKEN");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });

  if (!user) {
    await pubClient.del(`refresh:${token}`);
    throw new Error("INVALID_TOKEN");
  }

  return user;
}
