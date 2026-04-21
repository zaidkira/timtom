import type { NextFunction, Request, Response } from "express";
import { db, distributorsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export type AppRole = "admin" | "distributor";

export async function attachDistributorId(
  userId: number,
  role: AppRole,
): Promise<number | null> {
  if (role !== "distributor") {
    return null;
  }

  const distributor = await db
    .select({ id: distributorsTable.id })
    .from(distributorsTable)
    .where(eq(distributorsTable.userId, userId));

  return distributor[0]?.id ?? null;
}

export async function hydrateSessionUser(req: Request): Promise<void> {
  const userId = req.session.userId;
  if (!userId) {
    return;
  }

  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const user = users[0];

  if (!user || !user.isActive) {
    req.session.destroy(() => {});
    return;
  }

  req.session.role = user.role;
  req.session.distributorId = await attachDistributorId(user.id, user.role);
 }

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  await hydrateSessionUser(req);

  if (!req.session.userId || !req.session.role) {
    res.status(401).json({ error: "unauthorized", message: "Authentication required" });
    return;
  }

  next();
}

export function requireRole(...roles: AppRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    await requireAuth(req, res, async () => {
      if (!req.session.role || !roles.includes(req.session.role)) {
        res.status(403).json({ error: "forbidden", message: "Insufficient permissions" });
        return;
      }

      next();
    });
  };
}

export function getSessionContext(req: Request) {
  return {
    userId: req.session.userId ?? null,
    role: req.session.role ?? null,
    distributorId: req.session.distributorId ?? null,
  };
}
