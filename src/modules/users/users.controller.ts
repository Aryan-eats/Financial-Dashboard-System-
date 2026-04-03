import type { Request, Response } from "express";
import { Role, UserStatus } from "@prisma/client";

import { successResponse } from "../../utils/apiResponse";
import { usersService } from "./users.service";

export const usersController = {
  async getMe(req: Request, res: Response) {
    const result = await usersService.getMe(req.user!.userId);
    res.status(200).json(successResponse(result));
  },

  async listUsers(req: Request, res: Response) {
    const result = await usersService.listUsers(req.query as never);
    res.status(200).json(successResponse(result));
  },

  async updateRole(req: Request<{ id: string }, unknown, { role: Role }>, res: Response) {
    const result = await usersService.updateRole(req.params.id, req.body.role);
    res.status(200).json(successResponse(result));
  },

  async updateStatus(
    req: Request<{ id: string }, unknown, { status: UserStatus }>,
    res: Response,
  ) {
    const result = await usersService.updateStatus(req.params.id, req.body.status);
    res.status(200).json(successResponse(result));
  },
};
