import { Role, UserStatus } from "@prisma/client";
import { z } from "zod";

export const userIdSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid user ID format"),
  }),
});

export const listUsersQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    role: z.nativeEnum(Role).optional(),
    status: z.nativeEnum(UserStatus).optional(),
  }),
});

export const updateUserRoleSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid user ID format"),
  }),
  body: z.object({
    role: z.nativeEnum(Role),
  }),
});

export const updateUserStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid user ID format"),
  }),
  body: z.object({
    status: z.nativeEnum(UserStatus),
  }),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>["query"];
