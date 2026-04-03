import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

import { AppError } from "../utils/AppError";

interface ValidatedRequestData {
  body?: Request["body"];
  query?: Request["query"];
  params?: Request["params"];
}

export function validate(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.slice(1).join("."),
        message: issue.message,
      }));

      throw new AppError(422, "Validation failed", errors);
    }

    const data = result.data as ValidatedRequestData;

    if (data.body !== undefined) {
      req.body = data.body;
    }

    if (data.query !== undefined) {
      Object.defineProperty(req, "query", {
        value: data.query,
        configurable: true,
        writable: true,
      });
    }

    if (data.params !== undefined && typeof req.params === "object" && req.params !== null) {
      Object.assign(req.params, data.params);
    }

    next();
  };
}
