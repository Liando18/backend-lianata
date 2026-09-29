import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined in .env.local");
  }

  console.log("🚀 Running migrations against Neon PostgreSQL...");
  const sql = neon(connectionString);
  const db = drizzle(sql);

  await migrate(db, { migrationsFolder: "./db/migrations" });
  console.log("✅ Migrations applied successfully!");
}

runMigration().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
