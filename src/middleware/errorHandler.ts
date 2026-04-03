import type { NextFunction, Request, Response } from "express";

import { AppError } from "../utils/AppError";

interface PrismaLikeError {
  code: string;
}

function isPrismaKnownRequestError(error: unknown): error is PrismaLikeError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  );
}

function mapPrismaError(error: PrismaLikeError) {
  if (error.code === "P2002") {
    return {
      statusCode: 409,
      message: "A resource with that value already exists.",
    };
  }

  return {
    statusCode: 500,
    message: "Internal server error",
  };
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: "error",
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {}),
    });
    return;
  }

  if (isPrismaKnownRequestError(err)) {
    const mapped = mapPrismaError(err);

    res.status(mapped.statusCode).json({
      status: "error",
      message: mapped.message,
    });
    return;
  }

  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({
      status: "error",
      message: "Invalid JSON in request body",
    });
    return;
  }

  console.error("[UNHANDLED ERROR]", err);

  res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
}
