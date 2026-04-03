import type { Request, Response } from "express";

import { successResponse } from "../../utils/apiResponse";
import { authService } from "./auth.service";
import type { LoginInput, RegisterInput } from "./auth.schema";

export const authController = {
  async register(req: Request<unknown, unknown, RegisterInput>, res: Response) {
    const result = await authService.register(req.body);
    res.status(201).json(successResponse(result));
  },

  async login(req: Request<unknown, unknown, LoginInput>, res: Response) {
    const result = await authService.login(req.body);
    res.status(200).json(successResponse(result));
  },
};
