import { RecordCategory, RecordType } from "@prisma/client";
import { z } from "zod";

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export const createRecordSchema = z.object({
  body: z.object({
    type: z.nativeEnum(RecordType),
    category: z.nativeEnum(RecordCategory),
    amount: z
      .number()
      .positive("Amount must be greater than 0")
      .multipleOf(0.01, "Amount can have at most 2 decimal places"),
    description: z.string().max(500).optional(),
    date: z.string().regex(isoDate, "Invalid date format. Use YYYY-MM-DD"),
  }),
});

export const updateRecordSchema = z.object({
  body: z
    .object({
      type: z.nativeEnum(RecordType).optional(),
      category: z.nativeEnum(RecordCategory).optional(),
      amount: z
        .number()
        .positive("Amount must be greater than 0")
        .multipleOf(0.01, "Amount can have at most 2 decimal places")
        .optional(),
      description: z.string().max(500).optional(),
      date: z.string().regex(isoDate, "Invalid date format. Use YYYY-MM-DD").optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
});

export const queryRecordsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    type: z.nativeEnum(RecordType).optional(),
    category: z.nativeEnum(RecordCategory).optional(),
    startDate: z.string().regex(isoDate, "Invalid date format. Use YYYY-MM-DD").optional(),
    endDate: z.string().regex(isoDate, "Invalid date format. Use YYYY-MM-DD").optional(),
    sortBy: z.enum(["date", "amount", "createdAt"]).default("date"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
});

export const recordIdSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid record ID format"),
  }),
});

export type CreateRecordInput = z.infer<typeof createRecordSchema>["body"];
export type UpdateRecordInput = z.infer<typeof updateRecordSchema>["body"];
export type QueryRecordsInput = z.infer<typeof queryRecordsSchema>["query"];
