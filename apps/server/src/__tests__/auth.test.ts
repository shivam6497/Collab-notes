import request from "supertest";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";
import { pubClient } from "../lib/redis.js";

function getCookies(res: request.Response): string[] {
  const raw = res.headers["set-cookie"];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function extractCookieValue(cookies: string[], name: string): string {
  const cookie = cookies.find((c) => c.startsWith(`${name}=`));
  if (!cookie) return "";
  const pair = cookie.split(";")[0];
  return pair?.split("=").slice(1).join("=") ?? "";
}

// Timeout is set in jest.config.ts (testTimeout: 30000)

const TEST_EMAIL = `test_${Date.now()}@test.com`;
const TEST_PASSWORD = "password123";

describe("Auth Routes", () => {
  let accessToken: string;
  let refreshTokenCookie: string;

  // Flush leftover rate-limit keys so a previous failed run doesn't block us
  beforeAll(async () => {
    const keys = await pubClient.keys("r1:auth:*");
    if (keys.length) await pubClient.del(...keys);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  });


  describe("POST /api/auth/register", () => {
    it("should register a new user", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe(TEST_EMAIL);
      // accessToken now in cookie not body
      const cookies = getCookies(res);
      expect(cookies.length).toBeGreaterThan(0);
      expect(cookies.some((c) => c.startsWith("accessToken="))).toBe(true);
      expect(cookies.some((c) => c.startsWith("refreshToken="))).toBe(true);

      // extract tokens for later tests
      accessToken = extractCookieValue(cookies, "accessToken");
      refreshTokenCookie = cookies.find((c) => c.startsWith("refreshToken=")) ?? "";
    });

    it("should reject duplicate email", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Email already taken");
    });

    it("should reject short password", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "new@test.com", password: "short" });

      expect(res.status).toBe(400);
    });

    it("should reject missing fields", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: TEST_EMAIL });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login with correct credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe(TEST_EMAIL);

      const cookies = getCookies(res);
      accessToken = extractCookieValue(cookies, "accessToken");
      refreshTokenCookie = cookies.find((c) => c.startsWith("refreshToken=")) ?? "";
    });

    it("should reject wrong password", async () => {
      // wait to avoid rate limit (authLimiter: 5 req/10s, 60s block)
      await new Promise((r) => setTimeout(r, 12000));

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: TEST_EMAIL, password: "wrongpassword" });

      expect(res.status).toBe(401);
    });

    it("should reject non-existent email", async () => {
      // wait to avoid rate limit
      await new Promise((r) => setTimeout(r, 12000));
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "nobody@test.com", password: TEST_PASSWORD });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return user with valid token cookie", async () => {
      // wait to avoid rate limit from previous login tests
      await new Promise((r) => setTimeout(r, 12000));

      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
      const cookies = getCookies(loginRes);
      const token = extractCookieValue(cookies, "accessToken");

      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", `accessToken=${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(TEST_EMAIL);
    });

    it("should reject missing token", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
    });

    it("should reject invalid token", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", "accessToken=invalidtoken");
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("should issue new access token with valid refresh cookie", async () => {
      expect(refreshTokenCookie).toBeDefined();

      const res = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", refreshTokenCookie);

      expect(res.status).toBe(200);
      const cookies = getCookies(res);
      expect(cookies.some((c) => c.startsWith("accessToken="))).toBe(true);

      refreshTokenCookie = cookies.find((c) => c.startsWith("refreshToken=")) ?? refreshTokenCookie;
    });

    it("should reject missing refresh cookie", async () => {
      const res = await request(app).post("/api/auth/refresh");
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should logout successfully", async () => {
      expect(refreshTokenCookie).toBeDefined();

      const res = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", `accessToken=${accessToken}; ${refreshTokenCookie}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Logout Successfully");
    });
  });
});