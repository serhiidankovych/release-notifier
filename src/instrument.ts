import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { config } from "./config/unifiedConfig.js";

if (config.sentry.dsn) {
  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.sentry.environment,
    tracesSampleRate: config.sentry.tracesSampleRate,
    integrations: [nodeProfilingIntegration()],
    profilesSampleRate: 0.1,
  });

  Sentry.setTags({ service: "release-notifier" });
}
