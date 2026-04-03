import { Role, UserStatus } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";

import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";
import * as defaultJwtService from "../utils/jwt";

interface AuthenticateDependencies {
  jwt: {
    verifyToken(token: string): { userId: string; role: Role };
  };
  users: {
    findAuthUserById(
      userId: string,
    ): Promise<{ id: string; role: Role; status: UserStatus } | null>;
  };
}

export function createAuthenticateMiddleware(dependencies: AuthenticateDependencies) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(401, "Authentication required. Provide a Bearer token.");
    }

    const token = authHeader.split(" ")[1];
    const payload = dependencies.jwt.verifyToken(token);
    const user = await dependencies.users.findAuthUserById(payload.userId);

    if (!user) {
      throw new AppError(401, "Invalid or expired token.");
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AppError(403, "User account is inactive.");
    }

    req.user = {
      userId: user.id,
      role: user.role,
      status: user.status,
    };

    next();
  };
}

export const authenticate = createAuthenticateMiddleware({
  jwt: defaultJwtService,
  users: {
    async findAuthUserById(userId) {
      return prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          status: true,
        },
      });
    },
  },
});
