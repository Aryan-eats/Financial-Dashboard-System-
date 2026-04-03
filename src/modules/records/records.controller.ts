import type { Request, Response } from "express";

import { successResponse } from "../../utils/apiResponse";
import { recordsService } from "./records.service";
import type { CreateRecordInput, UpdateRecordInput } from "./records.schema";

export const recordsController = {
  async list(req: Request, res: Response) {
    const result = await recordsService.listRecords(req.user!, req.query as never);
    res.status(200).json(successResponse(result));
  },

  async getById(req: Request<{ id: string }>, res: Response) {
    const result = await recordsService.getRecordById(req.user!, req.params.id);
    res.status(200).json(successResponse(result));
  },

  async create(req: Request<unknown, unknown, CreateRecordInput>, res: Response) {
    const result = await recordsService.createRecord(req.user!, req.body);
    res.status(201).json(successResponse(result));
  },

  async update(req: Request<{ id: string }, unknown, UpdateRecordInput>, res: Response) {
    const result = await recordsService.updateRecord(req.user!, req.params.id, req.body);
    res.status(200).json(successResponse(result));
  },

  async remove(req: Request<{ id: string }>, res: Response) {
    const result = await recordsService.deleteRecord(req.user!, req.params.id);
    res.status(200).json(successResponse(result));
  },
};
