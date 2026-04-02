import { type Request, type Response, type NextFunction } from "express";
import { db, gymsTable, gymStaffTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const PREVIEW_USER_ID = "__preview_user__";

async function ensurePreviewUser() {
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, PREVIEW_USER_ID));

  if (existing) return existing;

  const [user] = await db
    .insert(usersTable)
    .values({
      id: PREVIEW_USER_ID,
      email: "preview@dev.local",
      firstName: "Preview",
      lastName: "User",
      profileImageUrl: null,
    })
    .onConflictDoUpdate({
      target: usersTable.id,
      set: { updatedAt: new Date() },
    })
    .returning();

  return user;
}

async function ensurePreviewUserHasGym(userId: string) {
  const [staffEntry] = await db
    .select({ gymId: gymStaffTable.gymId })
    .from(gymStaffTable)
    .where(eq(gymStaffTable.userId, userId))
    .limit(1);

  if (staffEntry) return;

  const [gym] = await db.select().from(gymsTable).limit(1);
  if (!gym) return;

  await db
    .insert(gymStaffTable)
    .values({
      gymId: gym.id,
      userId,
      firstName: "Preview",
      lastName: "User",
      email: "preview@dev.local",
      role: "gym_owner",
    })
    .onConflictDoNothing();
}

export async function previewMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (process.env.NODE_ENV === "production") {
    next();
    return;
  }

  const hasPreviewHeader = req.headers["x-preview"] === "1";
  const hasPreviewQuery = req.query.preview === "1";
  const hasPreviewCookie = req.cookies?.["__dev_preview"] === "1";
  if (!hasPreviewHeader && !hasPreviewQuery && !hasPreviewCookie) {
    next();
    return;
  }

  try {
    const user = await ensurePreviewUser();
    await ensurePreviewUserHasGym(user.id);

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      isAuthenticated: true,
    };

    req.isAuthenticated = function (this: Request) {
      return this.user != null;
    } as Request["isAuthenticated"];

    if (!hasPreviewCookie) {
      _res.cookie("__dev_preview", "1", {
        httpOnly: false,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 60 * 1000,
      });
    }
  } catch (err) {
    console.error("Preview middleware error:", err);
  }

  next();
}
