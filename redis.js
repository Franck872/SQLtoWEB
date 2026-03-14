import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redisUrl = process.env.REDIS_URL;

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  reconnectOnError: () => true,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000);
    return delay;
  },
  tls: redisUrl.startsWith("rediss://") ? {} : undefined
});

redis.on("connect", () => {
  console.log("✅ Connected to Redis");
});

redis.on("ready", () => {
  console.log("🚀 Redis ready");
});

redis.on("error", (err) => {
  console.error("❌ Redis error:", err);
});

redis.on("close", () => {
  console.warn("⚠️ Redis connection closed");
});

redis.on("reconnecting", () => {
  console.log("🔄 Reconnecting to Redis...");
});
