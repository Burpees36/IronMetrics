import { Router, type IRouter } from "express";
import { eq, count } from "drizzle-orm";
import { db, documentsTable, membersTable } from "@workspace/db";
import { CreateDocumentBody } from "@workspace/api-zod";

const router: IRouter = Router();

function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

router.get("/gyms/:gymId/documents", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const docs = await db.select().from(documentsTable).where(eq(documentsTable.gymId, gymId));
  const [totalMembersResult] = await db.select({ count: count() }).from(membersTable).where(eq(membersTable.gymId, gymId));

  const totalMembers = totalMembersResult?.count ?? 0;

  res.json(
    docs.map((d) => ({
      ...d,
      signedCount: 0,
      totalMembers,
    }))
  );
});

router.post("/gyms/:gymId/documents", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const parsed = CreateDocumentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [doc] = await db.insert(documentsTable).values({ ...parsed.data, gymId }).returning();
  res.status(201).json({ ...doc, signedCount: 0, totalMembers: 0 });
});

export default router;
