import { Role } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";

import { AppError } from "../utils/AppError";

export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(401, "Authentication required.");
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(403, "Access denied.");
    }

    next();
  };
}
