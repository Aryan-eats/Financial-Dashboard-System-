import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

import { AppError } from "./AppError";
import { getEnv } from "../config/env";

export interface AuthTokenPayload {
  userId: string;
  role: Role;
}

export interface JwtService {
  signToken(payload: AuthTokenPayload): string;
  verifyToken(token: string): AuthTokenPayload;
}

export function createJwtService(config: {
  secret: string;
  expiresIn: string;
}): JwtService {
  return {
    signToken(payload) {
      return jwt.sign(payload, config.secret, {
        expiresIn: config.expiresIn as jwt.SignOptions["expiresIn"],
      });
    },
    verifyToken(token) {
      try {
        const payload = jwt.verify(token, config.secret);

        if (
          typeof payload !== "object" ||
          payload === null ||
          typeof payload.userId !== "string" ||
          !Object.values(Role).includes(payload.role as Role)
        ) {
          throw new AppError(401, "Invalid or expired token.");
        }

        return {
          userId: payload.userId,
          role: payload.role as Role,
        };
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }

        throw new AppError(401, "Invalid or expired token.");
      }
    },
  };
}

export function signToken(payload: AuthTokenPayload): string {
  const env = getEnv();
  return createJwtService({
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  }).signToken(payload);
}

export function verifyToken(token: string): AuthTokenPayload {
  const env = getEnv();
  return createJwtService({
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  }).verifyToken(token);
}
