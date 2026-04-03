import { Prisma, RecordCategory, RecordType, Role, UserStatus } from "@prisma/client";

import { prisma } from "../../config/prisma";
import type { CurrentUser, PaginationMeta } from "../../types/common";
import { AppError } from "../../utils/AppError";
import type { CreateRecordInput, QueryRecordsInput, UpdateRecordInput } from "./records.schema";

type RecordEntity = {
  id: string;
  userId: string;
  type: RecordType;
  category: RecordCategory;
  amount: Prisma.Decimal | string;
  description: string | null;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type ListResult = { records: RecordEntity[]; total: number };

interface RecordsRepository {
  list(currentUser: CurrentUser, query: QueryRecordsInput): Promise<ListResult>;
  findActiveById(id: string): Promise<RecordEntity | null>;
  create(data: {
    userId: string;
    type: RecordType;
    category: RecordCategory;
    amount: number;
    description?: string;
    date: Date;
  }): Promise<RecordEntity>;
  update(id: string, data: Partial<{
    type: RecordType;
    category: RecordCategory;
    amount: number;
    description?: string;
    date: Date;
  }>): Promise<RecordEntity>;
  softDelete(id: string, deletedAt: Date): Promise<void>;
}

function toNumber(value: Prisma.Decimal | string) {
  return typeof value === "string" ? Number(value) : Number(value.toString());
}

function normalizeRecord(record: RecordEntity) {
  return {
    id: record.id,
    userId: record.userId,
    type: record.type,
    category: record.category,
    amount: toNumber(record.amount),
    description: record.description,
    date: record.date.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function canAccessRecord(currentUser: CurrentUser, record: RecordEntity) {
  return currentUser.role === Role.ADMIN || record.userId === currentUser.userId;
}

export function createRecordsService(dependencies: { records: RecordsRepository }) {
  return {
    async listRecords(currentUser: CurrentUser, query: QueryRecordsInput) {
      const page = query.page ?? 1;
      const limit = query.limit ?? 10;
      const result = await dependencies.records.list(currentUser, { ...query, page, limit });

      return {
        records: result.records.map(normalizeRecord),
        pagination: <PaginationMeta>{
          page,
          limit,
          total: result.total,
          totalPages: Math.max(1, Math.ceil(result.total / limit)),
        },
      };
    },

    async getRecordById(currentUser: CurrentUser, id: string) {
      const record = await dependencies.records.findActiveById(id);

      if (!record || !canAccessRecord(currentUser, record)) {
        throw new AppError(404, "Record not found.");
      }

      return { record: normalizeRecord(record) };
    },

    async createRecord(currentUser: CurrentUser, input: CreateRecordInput) {
      const record = await dependencies.records.create({
        userId: currentUser.userId,
        type: input.type,
        category: input.category,
        amount: input.amount,
        description: input.description,
        date: new Date(input.date),
      });

      return { record: normalizeRecord(record) };
    },

    async updateRecord(currentUser: CurrentUser, id: string, input: UpdateRecordInput) {
      const existingRecord = await dependencies.records.findActiveById(id);

      if (!existingRecord || !canAccessRecord(currentUser, existingRecord)) {
        throw new AppError(404, "Record not found.");
      }

      const updateData: Partial<{
        type: RecordType;
        category: RecordCategory;
        amount: number;
        description?: string;
        date: Date;
      }> = {
        ...(input.type ? { type: input.type } : {}),
        ...(input.category ? { category: input.category } : {}),
        ...(typeof input.amount === "number" ? { amount: input.amount } : {}),
        ...(Object.prototype.hasOwnProperty.call(input, "description")
          ? { description: input.description }
          : {}),
        ...(input.date ? { date: new Date(input.date) } : {}),
      };

      const updatedRecord = await dependencies.records.update(id, updateData);

      return { record: normalizeRecord(updatedRecord) };
    },

    async deleteRecord(currentUser: CurrentUser, id: string) {
      const existingRecord = await dependencies.records.findActiveById(id);

      if (!existingRecord || !canAccessRecord(currentUser, existingRecord)) {
        throw new AppError(404, "Record not found.");
      }

      await dependencies.records.softDelete(id, new Date());

      return { success: true };
    },
  };
}

function buildWhere(currentUser: CurrentUser, query: QueryRecordsInput): Prisma.FinancialRecordWhereInput {
  return {
    deletedAt: null,
    ...(currentUser.role !== Role.ADMIN ? { userId: currentUser.userId } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(query.startDate || query.endDate
      ? {
          date: {
            ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
            ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
          },
        }
      : {}),
  };
}

const recordSelect = {
  id: true,
  userId: true,
  type: true,
  category: true,
  amount: true,
  description: true,
  date: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const;

export const recordsService = createRecordsService({
  records: {
    async list(currentUser, query) {
      const where = buildWhere(currentUser, query);
      const skip = ((query.page ?? 1) - 1) * (query.limit ?? 10);
      const take = query.limit ?? 10;
      const sortBy = query.sortBy ?? "date";
      const sortOrder = query.sortOrder ?? "desc";

      const [records, total] = await Promise.all([
        prisma.financialRecord.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          skip,
          take,
          select: recordSelect,
        }),
        prisma.financialRecord.count({ where }),
      ]);

      return { records, total };
    },
    async findActiveById(id) {
      return prisma.financialRecord.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        select: recordSelect,
      });
    },
    async create(data) {
      return prisma.financialRecord.create({
        data,
        select: recordSelect,
      });
    },
    async update(id, data) {
      return prisma.financialRecord.update({
        where: { id },
        data,
        select: recordSelect,
      });
    },
    async softDelete(id, deletedAt) {
      await prisma.financialRecord.update({
        where: { id },
        data: { deletedAt },
      });
    },
  },
});
