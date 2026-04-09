import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  const checks: Record<string, string> = {};

  try {
    const result = await pool.query("SELECT 1 AS ok");
    checks.database = result.rows[0]?.ok === 1 ? "healthy" : "unhealthy";
  } catch (err: any) {
    checks.database = "unreachable";
    console.error("Health check: database unreachable:", err.message);
  }

  const allHealthy = Object.values(checks).every((v) => v === "healthy");
  const status = allHealthy ? "ok" : "degraded";

  res.status(allHealthy ? 200 : 503).json({ status, checks });
});

export default router;
