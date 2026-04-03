import type { Request, Response } from "express";

import { successResponse } from "../../utils/apiResponse";
import { dashboardService } from "./dashboard.service";

export const dashboardController = {
  async summary(req: Request, res: Response) {
    const result = await dashboardService.getSummary(req.user!, req.query as never);
    res.status(200).json(successResponse(result));
  },

  async categoryBreakdown(req: Request, res: Response) {
    const result = await dashboardService.getCategoryBreakdown(req.user!, req.query as never);
    res.status(200).json(successResponse(result));
  },

  async trends(req: Request, res: Response) {
    const result = await dashboardService.getTrends(req.user!, req.query as never);
    res.status(200).json(successResponse(result));
  },

  async recent(req: Request, res: Response) {
    const result = await dashboardService.getRecent(req.user!, req.query as never);
    res.status(200).json(successResponse(result));
  },
};
