import express, { type Express } from "express";
import cors from "cors";
import rateLimit, { type Options } from "express-rate-limit";
import { clerkMiddleware } from "@clerk/express";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
import { previewMiddleware } from "./middlewares/previewMiddleware";
import { WebhookHandlers } from "./webhookHandlers";
import router from "./routes";
import paymentUpdatePublicRouter from "./routes/payment-update-public";
import leadCaptureRouter from "./routes/lead-capture";
import publicWodRouter from "./routes/public-wod";
import unsubscribeRouter from "./routes/unsubscribe";

const app: Express = express();

app.set("trust proxy", 1);

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

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

const allowedOrigins: (string | RegExp)[] = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : process.env.NODE_ENV === "production"
    ? [
        "https://iron-metrics.app",
        "https://www.iron-metrics.app",
        "https://forgeos.app",
        "https://www.forgeos.app",
      ]
    : [/\.replit\.dev$/, /\.replit\.app$/, /localhost/];

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
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(clerkMiddleware());

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again in a moment." },
  validate: { ip: false, trustProxy: false },
} as Partial<Options>);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please try again later." },
  validate: { ip: false, trustProxy: false },
} as Partial<Options>);

const paymentUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
  validate: { ip: false, trustProxy: false },
} as Partial<Options>);

const leadCaptureLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many submissions. Please try again later." },
  validate: { ip: false, trustProxy: false },
} as Partial<Options>);

import healthRouter from "./routes/health";
app.use("/api", healthRouter);

app.use("/api/payment-update", paymentUpdateLimiter);
app.use("/api/lead-capture", leadCaptureLimiter);
app.use("/api", apiLimiter);

app.use("/api", paymentUpdatePublicRouter);
app.use("/api", leadCaptureRouter);
app.use("/api", publicWodRouter);
app.use("/api", unsubscribeRouter);

app.use(previewMiddleware);

app.use("/api", router);

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
