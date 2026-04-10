import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import compression from "compression";
import * as Sentry from "@sentry/node";
import swaggerUi from "swagger-ui-express";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import { errorBoundary } from "./middleware/errorBoundary.js";
import { swaggerDocument } from "./docs/swaggerDef.js";
import { config } from "./config/unifiedConfig.js";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: config.server.corsOrigins,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  }),
);

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (config.sentry.environment === "development") {
  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      customSiteTitle: "GitHub Release Notification API Docs",
    }),
  );
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use("/api", apiLimiter);
app.use("/api", subscriptionRoutes);

Sentry.setupExpressErrorHandler(app);

app.use(errorBoundary);

export default app;
