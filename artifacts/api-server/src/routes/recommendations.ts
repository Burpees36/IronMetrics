import { Router, type IRouter } from "express";
import {
  getRecommendationExecutionState,
  toggleChecklistItem,
  logOwnerAction,
  getOwnerActions,
  getPeriodStart,
} from "../services/recommendation-learning";

const router: IRouter = Router();

function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

router.get("/gyms/:gymId/recommendations/execution", async (req, res): Promise<void> => {
  try {
    const gymId = parseGymId(req.params);
    if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

    const periodStart = typeof req.query.periodStart === "string" ? req.query.periodStart : getPeriodStart();
    const cards = await getRecommendationExecutionState(gymId, periodStart);
    res.json({ cards, periodStart });
  } catch (error) {
    console.error("Error fetching recommendation execution state:", error);
    res.status(500).json({ error: "Failed to fetch recommendation execution state" });
  }
});

router.post("/gyms/:gymId/recommendations/:recommendationId/checklist/:itemId", async (req, res): Promise<void> => {
  try {
    const gymId = parseGymId(req.params);
    if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

    const recommendationId = parseInt(req.params.recommendationId, 10);
    if (isNaN(recommendationId)) { res.status(400).json({ error: "Invalid recommendation ID" }); return; }

    await toggleChecklistItem(gymId, recommendationId, req.params.itemId, Boolean(req.body.checked), req.body.note);
    const periodStart = typeof req.body.periodStart === "string" ? req.body.periodStart : getPeriodStart();
    const cards = await getRecommendationExecutionState(gymId, periodStart);
    res.json({ cards });
  } catch (error: any) {
    console.error("Error updating checklist item:", error);
    res.status(400).json({ error: error.message || "Failed to update checklist item" });
  }
});

router.post("/gyms/:gymId/recommendations/actions", async (req, res): Promise<void> => {
  try {
    const gymId = parseGymId(req.params);
    if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

    const text = String(req.body.text || "").trim();
    if (!text) { res.status(400).json({ error: "Action text is required" }); return; }

    const periodStart = typeof req.body.periodStart === "string" ? req.body.periodStart : getPeriodStart();
    const action = await logOwnerAction(gymId, periodStart, text);
    res.status(201).json(action);
  } catch (error) {
    console.error("Error logging owner action:", error);
    res.status(500).json({ error: "Failed to log action" });
  }
});

router.get("/gyms/:gymId/recommendations/actions", async (req, res): Promise<void> => {
  try {
    const gymId = parseGymId(req.params);
    if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const actions = await getOwnerActions(gymId, limit, offset);
    res.json(actions);
  } catch (error) {
    console.error("Error fetching owner actions:", error);
    res.status(500).json({ error: "Failed to fetch owner actions" });
  }
});

export default router;
