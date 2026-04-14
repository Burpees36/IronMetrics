declare namespace Express {
  interface Request {
    userId?: string;
    gymRole?: string;
    gymId?: number;
    billingRole?: string;
    billingPermissions?: string[];
    programmingRole?: import("../middlewares/programmingRbac").ProgrammingRole;
    memberAllowedTracks?: string[];
  }
}
