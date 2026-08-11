import { prisma } from "../lib/prisma.js";
import { pubClient, subClient } from "../lib/redis.js";

afterAll(async () => {
  await prisma.$disconnect();
  pubClient.disconnect();
  subClient.disconnect();
});