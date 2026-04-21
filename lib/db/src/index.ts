import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

export let db: any;
export let pool: any;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Configure your Supabase Postgres connection string.");
}

pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
db = drizzlePg(pool, { schema });

export * from "./schema";
