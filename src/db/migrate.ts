import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./db.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = join(__dirname, "migrations");

console.log("Running database migrations...");
console.log("Migrations folder:", migrationsFolder);

try {
  await migrate(db, { migrationsFolder });
  console.log("Migrations complete.");
} catch (error) {
  console.error("Migration failed:", error);
  process.exit(1);
} finally {
  await pool.end();
}
