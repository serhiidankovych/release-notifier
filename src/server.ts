import "./instrument.js";
import http from "http";
import app from "./app.js";
import { config } from "./config/unifiedConfig.js";
import { CronService } from "./services/cronService.js";
import { db, pool } from "./db/db.js";
import { migrate } from "drizzle-orm/node-postgres/migrator";

let cronService: CronService | null = null;
let httpServer: http.Server | null = null;

async function bootstrap(): Promise<void> {
  try {
    console.log("Running database migrations...");
    await migrate(db, { migrationsFolder: "./src/db/migrations" });
    console.log("Migrations complete.");
  } catch (error) {
    console.error("Failed to run migrations:", error);
    process.exit(1);
  }

  await new Promise<void>((resolve) => {
    httpServer = app.listen(config.server.port, "0.0.0.0", () => {
      console.log(`Server listening on port ${config.server.port}`);
      resolve();
    });
  });

  cronService = new CronService();
  cronService.start();
}

async function shutdown(signal: string): Promise<void> {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);

  if (cronService) {
    cronService.stop();
  }

  await new Promise<void>((resolve, reject) => {
    if (!httpServer) return resolve();
    httpServer.close((err) => {
      if (err) return reject(err);
      resolve();
    });
  });

  try {
    await pool.end();
    console.log("Database pool closed.");
  } catch (error) {
    console.error("Error closing database pool:", error);
  }

  console.log("Shutdown complete.");
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  void shutdown("unhandledRejection");
});

bootstrap().catch((error) => {
  console.error("Bootstrap failed:", error);
  process.exit(1);
});
