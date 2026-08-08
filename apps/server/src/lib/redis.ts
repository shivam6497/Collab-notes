import { Redis } from "ioredis";

/**
 * Build ioredis connection options from environment variables.
 * When `REDIS_URL` is set (e.g. Upstash), a URL-based connection is used and
 * TLS is enabled automatically for `rediss://` schemes.
 * Otherwise, individual host/port/password variables are used (local dev).
 */
const redisOptions = process.env.REDIS_URL
  ? {
      lazyConnect: true,
      tls: process.env.REDIS_URL.startsWith("rediss://") ? {} : undefined,
    }
  : {
      host: process.env.REDIS_HOST ?? "localhost",
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
    };

const createClient = () =>
  process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, redisOptions)
    : new Redis(redisOptions);

/**
 * `pubClient` is used for all general Redis operations (get, set, publish).
 * `subClient` is a duplicate reserved for subscriptions so the publish client
 * remains available for commands while subscriptions are active.
 */
export const pubClient = createClient();
export const subClient = pubClient.duplicate();

pubClient.on("connect", () => console.log("[Redis pub] connected"));
subClient.on("connect", () => console.log("[Redis sub] connected"));
pubClient.on("error", (err) => console.error("[Redis pub]", err));
subClient.on("error", (err) => console.error("[Redis sub]", err));