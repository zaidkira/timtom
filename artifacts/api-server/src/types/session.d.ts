import "express-session";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    role?: "admin" | "distributor";
    distributorId?: number | null;
  }
}
