import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export const DATABASE_URL =
  process.env.DATABASE_URL_SIGNAL ??
  process.env.DATABASE_URL ??
  "postgres://hp:hp@localhost:5432/hp_signal";

export const pool = new Pool({ connectionString: DATABASE_URL, max: 10 });

export type Db = NodePgDatabase<typeof schema>;
export const db: Db = drizzle(pool, { schema });
