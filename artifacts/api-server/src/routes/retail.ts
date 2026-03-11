import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, productsTable, salesTable, membersTable } from "@workspace/db";
import { CreateProductBody, CreateSaleBody } from "@workspace/api-zod";

const router: IRouter = Router();

function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

router.get("/gyms/:gymId/products", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const products = await db.select().from(productsTable).where(eq(productsTable.gymId, gymId));
  res.json(products.map((p) => ({ ...p, price: parseFloat(p.price) })));
});

router.post("/gyms/:gymId/products", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [product] = await db.insert(productsTable).values({
    ...parsed.data,
    gymId,
    price: String(parsed.data.price),
  }).returning();

  res.status(201).json({ ...product, price: parseFloat(product.price) });
});

router.get("/gyms/:gymId/sales", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const sales = await db.select().from(salesTable).where(eq(salesTable.gymId, gymId)).orderBy(desc(salesTable.createdAt));
  res.json(
    sales.map((s) => ({
      ...s,
      items: JSON.parse(s.items),
      subtotal: parseFloat(s.subtotal),
      tax: parseFloat(s.tax),
      total: parseFloat(s.total),
    }))
  );
});

router.post("/gyms/:gymId/sales", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const parsed = CreateSaleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  let subtotal = 0;
  const saleItems = [];
  for (const item of parsed.data.items) {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
    if (!product) continue;
    const price = parseFloat(product.price);
    subtotal += price * item.quantity;
    saleItems.push({ productId: item.productId, productName: product.name, quantity: item.quantity, price });

    if (product.stockQuantity !== null) {
      await db.update(productsTable).set({ stockQuantity: product.stockQuantity - item.quantity }).where(eq(productsTable.id, item.productId));
    }
  }

  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  let memberName = null;
  if (parsed.data.memberId) {
    const [member] = await db.select().from(membersTable).where(eq(membersTable.id, parsed.data.memberId));
    memberName = member ? `${member.firstName} ${member.lastName}` : null;
  }

  const [sale] = await db.insert(salesTable).values({
    gymId,
    memberId: parsed.data.memberId,
    memberName,
    items: JSON.stringify(saleItems),
    subtotal: String(subtotal),
    tax: String(tax),
    total: String(total),
    paymentMethod: parsed.data.paymentMethod,
  }).returning();

  res.status(201).json({
    ...sale,
    items: saleItems,
    subtotal,
    tax,
    total,
  });
});

export default router;
