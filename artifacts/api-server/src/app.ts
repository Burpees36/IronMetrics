/**
 * @module app
 * Express application entry point for the API server.
 *
 * Sets up the full middleware pipeline in a specific order:
 *   1. Stripe webhook (raw body, before JSON parsing)
 *   2. CORS, cookie parsing, JSON/URL-encoded body parsing
 *   3. Rate limiters (auth, payment-update, general API)
 *   4. Public routes (payment update — no auth required)
 *   5. Authentication middleware (all subsequent routes require auth)
 *   6. Protected API routes (gym-scoped, role-checked)
 *   7. Global error handler
 *
 * The Stripe webhook route is intentionally mounted before body-parsing
 * middleware because Stripe signature verification requires the raw
 * request body as a Buffer.
 *
 * CORS is configured via the ALLOWED_ORIGINS environment variable
 * (comma-separated list of allowed origins). When not set, it defaults
 * to allowing *.replit.dev and localhost for development.
 */
import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit, { type Options } from "express-rate-limit";
import { authMiddleware } from "./middlewares/authMiddleware";
import { previewMiddleware } from "./middlewares/previewMiddleware";
import { WebhookHandlers } from "./webhookHandlers";
import router from "./routes";
import paymentUpdatePublicRouter from "./routes/payment-update-public";
import leadCaptureRouter from "./routes/lead-capture";
import publicWodRouter from "./routes/public-wod";

const app: Express = express();

// Trust the first proxy hop (required for rate limiting behind a reverse proxy)
app.set("trust proxy", 1);

/**
 * Stripe webhook endpoint — mounted before JSON body parsing.
 * Uses express.raw() so the body arrives as a Buffer for signature verification.
 * Stripe sends a `stripe-signature` header that is validated against the raw payload.
 */
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res): Promise<void> => {
    const signature = req.headers["stripe-signature"];

    if (!signature) {
      res.status(400).json({ error: "Missing stripe-signature" });
      return;
    }

    try {
      // If multiple signature headers are present, use the first one
      const sig = Array.isArray(signature) ? signature[0] : signature;

      if (!Buffer.isBuffer(req.body)) {
        console.error("STRIPE WEBHOOK ERROR: req.body is not a Buffer.");
        res.status(500).json({ error: "Webhook processing error" });
        return;
      }

      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error.message);
      res.status(400).json({ error: "Webhook processing error" });
    }
  }
);

// --- Global middleware ---
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [/\.replit\.dev$/, /localhost/];

app.use(cors({
  credentials: true,
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.some((o) =>
      o instanceof RegExp ? o.test(origin) : o === origin
    );
    callback(null, allowed);
  },
}));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// --- Rate limiters ---

/** General API rate limiter: 120 requests per 60-second window. */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again in a moment." },
  validate: { ip: false, trustProxy: false },
} as Partial<Options>);

/** Auth route limiter: 30 attempts per 15-minute window (brute-force protection). */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please try again later." },
  validate: { ip: false, trustProxy: false },
} as Partial<Options>);

/** Payment update limiter: 15 requests per 15-minute window (tighter for sensitive ops). */
const paymentUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
  validate: { ip: false, trustProxy: false },
} as Partial<Options>);

/** Lead capture limiter: 20 requests per 15-minute window (spam prevention for public forms). */
const leadCaptureLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many submissions. Please try again later." },
  validate: { ip: false, trustProxy: false },
} as Partial<Options>);

// Apply rate limiters to their respective route prefixes
app.use("/api/login", authLimiter);
app.use("/api/callback", authLimiter);
app.use("/api/payment-update", paymentUpdateLimiter);
app.use("/api/lead-capture", leadCaptureLimiter);
app.use("/api", apiLimiter);

// Public routes that do not require authentication (e.g., payment update links, lead capture, public WOD)
app.use("/api", paymentUpdatePublicRouter);
app.use("/api", leadCaptureRouter);
app.use("/api", publicWodRouter);

// Dev-only preview bypass — must run before authMiddleware
app.use(previewMiddleware);

// Authentication middleware — everything below this point requires a valid session
app.use(authMiddleware);

// Protected API routes — gym-scoped routes are further guarded by requireGymAccess
app.use("/api", router);

/** Global error handler — catches unhandled errors from any route or middleware. */
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
