import { Prisma, RecordCategory, RecordType, Role, UserStatus } from "@prisma/client";

import { prisma } from "../../config/prisma";
import type { CurrentUser } from "../../types/common";
import type { DashboardQuery, RecentActivityQuery } from "./dashboard.schema";

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

type BreakdownRow = {
  category: RecordCategory;
  type: RecordType;
  totalAmount: number;
  recordCount: number;
};

type TrendRow = {
  month: string;
  income: number;
  expense: number;
};

type TrendQueryRow = {
  month: string;
  income: Prisma.Decimal | string | number;
  expense: Prisma.Decimal | string | number;
};

interface DashboardRepository {
  getSummary(currentUser: CurrentUser, query: DashboardQuery): Promise<{
    totalIncome: number;
    totalExpense: number;
    recordCount: number;
  }>;
  getCategoryBreakdown(currentUser: CurrentUser, query: DashboardQuery): Promise<BreakdownRow[]>;
  getTrends(currentUser: CurrentUser, query: DashboardQuery): Promise<TrendRow[]>;
  getRecentRecords(currentUser: CurrentUser, query: RecentActivityQuery): Promise<RecordEntity[]>;
}

function toNumber(value: Prisma.Decimal | string | number) {
  if (typeof value === "number") {
    return value;
  }

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

function buildBaseWhere(currentUser: CurrentUser, query: DashboardQuery): Prisma.FinancialRecordWhereInput {
  return {
    deletedAt: null,
    ...(currentUser.role !== Role.ADMIN ? { userId: currentUser.userId } : {}),
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

interface DashboardPrismaClient {
  $queryRaw<T = unknown>(query: Prisma.Sql): Promise<T>;
  financialRecord: {
    aggregate: typeof prisma.financialRecord.aggregate;
    count: typeof prisma.financialRecord.count;
    groupBy: typeof prisma.financialRecord.groupBy;
    findMany: typeof prisma.financialRecord.findMany;
  };
}

export function createDashboardService(dependencies: { dashboard: DashboardRepository }) {
  return {
    async getSummary(currentUser: CurrentUser, query: DashboardQuery) {
      const result = await dependencies.dashboard.getSummary(currentUser, query);

      return {
        totalIncome: result.totalIncome,
        totalExpense: result.totalExpense,
        netBalance: result.totalIncome - result.totalExpense,
        recordCount: result.recordCount,
      };
    },

    async getCategoryBreakdown(currentUser: CurrentUser, query: DashboardQuery) {
      const rows = await dependencies.dashboard.getCategoryBreakdown(currentUser, query);
      const totalAmount = rows.reduce((sum, row) => sum + row.totalAmount, 0);

      return {
        breakdown: rows.map((row) => ({
          ...row,
          percentage: totalAmount === 0 ? 0 : Number(((row.totalAmount / totalAmount) * 100).toFixed(2)),
        })),
      };
    },

    async getTrends(currentUser: CurrentUser, query: DashboardQuery) {
      return {
        trends: await dependencies.dashboard.getTrends(currentUser, query),
      };
    },

    async getRecent(currentUser: CurrentUser, query: RecentActivityQuery) {
      const records = await dependencies.dashboard.getRecentRecords(currentUser, query);

      return {
        records: records.map(normalizeRecord),
      };
    },
  };
}

export function createDashboardRepository(client: DashboardPrismaClient = prisma) {
  return {
    async getSummary(currentUser: CurrentUser, query: DashboardQuery) {
      const where = buildBaseWhere(currentUser, query);
      const [incomeResult, expenseResult, count] = await Promise.all([
        client.financialRecord.aggregate({
          where: { ...where, type: RecordType.INCOME },
          _sum: { amount: true },
        }),
        client.financialRecord.aggregate({
          where: { ...where, type: RecordType.EXPENSE },
          _sum: { amount: true },
        }),
        client.financialRecord.count({ where }),
      ]);

      return {
        totalIncome: incomeResult._sum.amount ? Number(incomeResult._sum.amount.toString()) : 0,
        totalExpense: expenseResult._sum.amount ? Number(expenseResult._sum.amount.toString()) : 0,
        recordCount: count,
      };
    },
    async getCategoryBreakdown(currentUser: CurrentUser, query: DashboardQuery) {
      const groups = await client.financialRecord.groupBy({
        by: ["category", "type"],
        where: buildBaseWhere(currentUser, query),
        _sum: { amount: true },
        _count: { id: true },
      });

      return groups.map((group: { category: RecordCategory; type: RecordType; _sum: { amount: Prisma.Decimal | null }; _count: { id: number } }) => ({
        category: group.category,
        type: group.type,
        totalAmount: group._sum.amount ? Number(group._sum.amount.toString()) : 0,
        recordCount: group._count.id,
      }));
    },
    async getTrends(currentUser: CurrentUser, query: DashboardQuery) {
      const userFilter =
        currentUser.role === Role.ADMIN
          ? Prisma.sql``
          : Prisma.sql`AND fr.user_id = ${currentUser.userId}`;

      const startFilter = query.startDate
        ? Prisma.sql`AND fr.date >= ${new Date(query.startDate)}`
        : Prisma.sql``;

      const endFilter = query.endDate
        ? Prisma.sql`AND fr.date <= ${new Date(query.endDate)}`
        : Prisma.sql``;

      const rows = await client.$queryRaw<TrendQueryRow[]>(Prisma.sql`
        SELECT
          TO_CHAR(DATE_TRUNC('month', fr.date), 'YYYY-MM') AS month,
          COALESCE(SUM(CASE WHEN fr.type = 'INCOME' THEN fr.amount ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN fr.type = 'EXPENSE' THEN fr.amount ELSE 0 END), 0) AS expense
        FROM financial_records fr
        WHERE fr.deleted_at IS NULL
          ${userFilter}
          ${startFilter}
          ${endFilter}
        GROUP BY DATE_TRUNC('month', fr.date)
        ORDER BY month ASC
      `);

      return rows.map((row) => ({
        month: row.month,
        income: toNumber(row.income),
        expense: toNumber(row.expense),
      }));
    },
    async getRecentRecords(currentUser: CurrentUser, query: RecentActivityQuery) {
      return client.financialRecord.findMany({
        where: buildBaseWhere(currentUser, query),
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: query.limit ?? 5,
        select: recordSelect,
      });
    },
  };
}

export const dashboardService = createDashboardService({
  dashboard: createDashboardRepository(),
});
