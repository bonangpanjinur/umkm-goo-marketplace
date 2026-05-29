import express, { type Express } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { pinoHttp } from "pino-http";
import router from "./routes/index.js";
import restRouter from "./routes/rest.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

// ── F1-4: CORS ────────────────────────────────────────────────────────────────
// Izinkan origin dari env ALLOWED_ORIGINS (comma-separated) atau fallback ke Replit dev domain.
const allowedOrigins = (process.env["ALLOWED_ORIGINS"] ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Izinkan non-browser requests (server-to-server, curl) dan localhost dev
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.length === 0 ||
        allowedOrigins.some((allowed) => origin.startsWith(allowed)) ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        origin.endsWith(".replit.dev") ||
        origin.endsWith(".repl.co")
      ) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin tidak diizinkan: ${origin}`));
    },
    credentials: true,
  }),
);

// ── F1-4: Rate Limiting ───────────────────────────────────────────────────────
// Global rate limiter: 200 req / 1 menit per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Terlalu banyak permintaan. Coba lagi dalam 1 menit." },
  skip: (req) => req.path === "/api/health",
});

// Strict limiter untuk endpoint auth/payment: 20 req / 1 menit per IP
const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Terlalu banyak percobaan. Coba lagi sebentar." },
});

app.use(globalLimiter);
app.use("/auth/v1", strictLimiter);
app.use("/api/payments", strictLimiter);
app.use("/api/staff/create-user", strictLimiter);

// ── Logging & Parsing ─────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────────────────────
// PostgREST-compatible proxy: /rest/v1/* and /auth/v1/* at root level
app.use(restRouter);

app.use("/api", router);

export default app;
