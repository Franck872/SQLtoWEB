import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  max: 10,                // nombre max de connexions
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,

  ssl: process.env.DATABASE_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : false
});

pool.on("connect", () => {
  console.log("✅ PostgreSQL connected");
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL pool error:", err);
});  
export async function query(text, params) {
  const start = Date.now();

  const res = await pool.query(text, params);

  const duration = Date.now() - start;

  if (duration > 200) {
    console.log("⚠️ slow query", { text, duration });
  }

  return res;
}
import { query } from "./db.js"

await query(
  "SELECT * FROM events WHERE status='active'"
)
