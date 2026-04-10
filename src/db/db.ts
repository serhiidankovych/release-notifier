import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { config } from "../config/unifiedConfig.js";
import * as schema from "./schema.js";

const { Pool } = pg;

export const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.username,
  password: config.database.password,
  database: config.database.database,
});

export const db = drizzle(pool, { schema });
