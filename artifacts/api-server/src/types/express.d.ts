declare namespace Express {
  interface Request {
    gymRole?: string;
    gymId?: number;
    billingRole?: string;
    billingPermissions?: string[];
    programmingRole?: import("../middlewares/programmingRbac").ProgrammingRole;
  }
}
