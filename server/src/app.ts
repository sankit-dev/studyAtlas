import cors from "cors";
import express from "express";
import { env, normalizeOrigin } from "./config/env.js";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import { geoBlock, restrictedCountryLimits } from "./middleware/geoBlock.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { booksRouter } from "./routes/books.js";
import { dsaProgressRouter } from "./routes/dsaProgress.js";
import { donationsRouter, handleDonationWebhook } from "./routes/donations.js";
import { healthRouter } from "./routes/health.js";
import { noteProgressRouter } from "./routes/noteProgress.js";

const WEBHOOK_IP_LIMIT = 120;

export function createApp() {
  const app = express();

  // Behind Render's proxy: without this, req.ip is the proxy's address and
  // every visitor shares one rate-limit bucket.
  app.set("trust proxy", env.trustProxy);

  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || env.allowedOrigins.includes(normalizeOrigin(origin))) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
    }),
  );
  // Signature verification needs the raw request body, so this route must be
  // registered before the JSON body parser. It also sits before the geo block
  // and global rate limit: Dodo's servers must always be able to reach it, so
  // it gets its own generous per-IP limit instead of the strict global one.
  app.post(
    "/api/donations/webhook",
    rateLimit({
      keyPrefix: "donation-webhook",
      limit: WEBHOOK_IP_LIMIT,
      windowMs: env.rateLimitWindowMs,
    }),
    express.raw({ type: "application/json" }),
    handleDonationWebhook,
  );

  app.use(geoBlock);
  app.use(
    rateLimit({
      keyPrefix: "global",
      limit: env.globalIpLimit,
      windowMs: env.rateLimitWindowMs,
    }),
  );
  app.use(restrictedCountryLimits());

  app.get("/", (req, res) => {
    if (req.query.error || req.query.code || Object.keys(req.query).length > 0) {
      const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
      return res.redirect(`${env.clientOrigin}/?${queryString}`);
    }
    res.json({ message: "Server is running" });
  });
  app.get("/api/auth/providers", (_request, response) => {
    response.json({
      providers: {
        github: Boolean(env.githubClientId && env.githubClientSecret),
      },
    });
  });

  app.all("/api/auth", toNodeHandler(auth));
  app.all("/api/auth/*splat", toNodeHandler(auth));

  app.use(express.json({ limit: "1mb" }));

  app.use("/api/health", healthRouter);
  app.use("/api/books", booksRouter);
  app.use("/api/donations", donationsRouter);
  app.use("/api/dsa/progress", dsaProgressRouter);
  app.use("/api/notes/progress", noteProgressRouter);

  app.use((_request, response) => {
    response.status(404).json({
      message: "Route not found",
    });
  });

  return app;
}
