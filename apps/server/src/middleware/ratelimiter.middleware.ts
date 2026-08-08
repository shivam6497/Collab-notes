import { RateLimiterRedis } from "rate-limiter-flexible";
import { pubClient } from "../lib/redis.js";
import { Request, Response, NextFunction } from "express";

/**
 * Strict limiter applied to authentication endpoints (login, register).
 * Allows 5 requests per 10 seconds per IP and blocks the IP for 60 s on
 * violation to slow down brute-force attempts.
 */
const authLimiter = new RateLimiterRedis({
    storeClient: pubClient,
    keyPrefix: "r1:auth",
    points: 5,
    duration: 10,
    blockDuration: 60,
});

/**
 * General API limiter for all other endpoints.
 * Allows 60 requests per minute per IP with a 30-second block on violation.
 */
const apiLimiter = new RateLimiterRedis({
    storeClient: pubClient,
    keyPrefix: "r1:api",
    points: 60,
    duration: 60,
    blockDuration: 30,
});

/**
 * Returns an Express middleware that enforces `limiter` on every request.
 * On success it sets `X-RateLimit-Remaining`; on violation it responds 429
 * with a `Retry-After` header.
 */
function createMiddleware(limiter: RateLimiterRedis) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = req.ip ?? "unknown";
    try {
      const result = await limiter.consume(key);
      res.setHeader("X-RateLimit-Remaining", result.remainingPoints);
      next();
    } catch (err: any) {
      const secs = Math.ceil(err.msBeforeNextReset / 1000);
      res.setHeader("Retry-After", secs);
      res.status(429).json({
        message: "Too many requests",
        retryAfter: secs,
      });
    }
  };
}

export const authRateLimit = createMiddleware(authLimiter);
export const apiRateLimit = createMiddleware(apiLimiter);