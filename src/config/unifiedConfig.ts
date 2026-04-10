import dotenv from "dotenv";

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string): string {
  return process.env[key] || "";
}

function parseIntEnv(key: string): number {
  const raw = requireEnv(key);
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) {
    throw new Error(
      `Environment variable ${key} must be an integer, got: "${raw}"`,
    );
  }
  return parsed;
}

function parseFloatEnv(key: string): number {
  const raw = requireEnv(key);
  const parsed = parseFloat(raw);
  if (isNaN(parsed)) {
    throw new Error(
      `Environment variable ${key} must be a float, got: "${raw}"`,
    );
  }
  return parsed;
}

export const config = {
  database: {
    host: requireEnv("DB_HOST"),
    port: parseIntEnv("DB_PORT"),
    username: requireEnv("DB_USER"),
    password: requireEnv("DB_PASSWORD"),
    database: requireEnv("DB_NAME"),
  },
  server: {
    port: parseIntEnv("PORT"),
    baseUrl: requireEnv("BASE_URL"),
    corsOrigins: requireEnv("CORS_ORIGINS")
      .split(",")
      .map((o) => o.trim()),
  },
  github: {
    token: requireEnv("GITHUB_TOKEN"),
    cronSchedule: requireEnv("CRON_SCHEDULE"),
  },
  email: {
    host: requireEnv("EMAIL_HOST"),
    port: parseIntEnv("EMAIL_PORT"),
    user: requireEnv("EMAIL_USER"),
    pass: requireEnv("EMAIL_PASS"),
    from: requireEnv("EMAIL_FROM"),
    maxRetries: parseIntEnv("EMAIL_MAX_RETRIES"),
  },
  sentry: {
    dsn: optionalEnv("SENTRY_DSN"),
    environment: requireEnv("NODE_ENV"),
    tracesSampleRate: parseFloatEnv("SENTRY_TRACES_SAMPLE_RATE"),
  },
  scanner: {
    concurrency: parseIntEnv("SCANNER_CONCURRENCY"),
  },
} as const;

export type Config = typeof config;
