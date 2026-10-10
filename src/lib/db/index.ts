import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// On Cloudflare the secret only exists at runtime; `next build` (Workers Builds) evaluates this
// module without it, so fall back to a placeholder URL there (no connection is made at import).
const databaseUrl =
  process.env.DATABASE_URL ||
  (process.env.NEXT_PHASE === "phase-production-build"
    ? "postgresql://build:build@localhost:5432/build"
    : undefined);

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create the Neon HTTP client
const sql = neon(databaseUrl);

// Create the Drizzle instance with the schema
export const db = drizzle(sql, { schema });

// Export all schema tables and relations for use in queries
export * from "./schema";
