import { z } from "zod";

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export const dashboardQuerySchema = z.object({
  query: z.object({
    startDate: z.string().regex(isoDate, "Invalid date format. Use YYYY-MM-DD").optional(),
    endDate: z.string().regex(isoDate, "Invalid date format. Use YYYY-MM-DD").optional(),
  }),
});

export const recentActivityQuerySchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(20).default(5),
    startDate: z.string().regex(isoDate, "Invalid date format. Use YYYY-MM-DD").optional(),
    endDate: z.string().regex(isoDate, "Invalid date format. Use YYYY-MM-DD").optional(),
  }),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>["query"];
export type RecentActivityQuery = z.infer<typeof recentActivityQuerySchema>["query"];
