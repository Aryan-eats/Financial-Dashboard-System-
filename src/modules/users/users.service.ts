import { Role, UserStatus } from "@prisma/client";

import { prisma } from "../../config/prisma";
import type { PaginationMeta } from "../../types/common";
import { AppError } from "../../utils/AppError";
import type { ListUsersQuery } from "./users.schema";

interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface UsersRepository {
  findById(id: string): Promise<UserRecord | null>;
  list(query: ListUsersQuery): Promise<{ users: UserRecord[]; total: number }>;
  countActiveAdmins(): Promise<number>;
  updateRole(id: string, role: Role): Promise<UserRecord>;
  updateStatus(id: string, status: UserStatus): Promise<UserRecord>;
}

function sanitizeUser(user: UserRecord) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function createUsersService(dependencies: { users: UsersRepository }) {
  return {
    async getMe(userId: string) {
      const user = await dependencies.users.findById(userId);

      if (!user) {
        throw new AppError(404, "User not found.");
      }

      return {
        user: sanitizeUser(user),
      };
    },

    async listUsers(query: ListUsersQuery) {
      const page = query.page ?? 1;
      const limit = query.limit ?? 10;
      const result = await dependencies.users.list({ ...query, page, limit });

      return {
        users: result.users.map(sanitizeUser),
        pagination: <PaginationMeta>{
          page,
          limit,
          total: result.total,
          totalPages: Math.max(1, Math.ceil(result.total / limit)),
        },
      };
    },

    async updateRole(id: string, role: Role) {
      const existingUser = await dependencies.users.findById(id);

      if (!existingUser) {
        throw new AppError(404, "User not found.");
      }

      if (existingUser.role === Role.ADMIN && role !== Role.ADMIN) {
        const adminCount = await dependencies.users.countActiveAdmins();

        if (adminCount <= 1 && existingUser.status === UserStatus.ACTIVE) {
          throw new AppError(409, "Cannot demote the last active admin.");
        }
      }

      const updatedUser = await dependencies.users.updateRole(id, role);

      return {
        user: sanitizeUser(updatedUser),
      };
    },

    async updateStatus(id: string, status: UserStatus) {
      const existingUser = await dependencies.users.findById(id);

      if (!existingUser) {
        throw new AppError(404, "User not found.");
      }

      if (
        existingUser.role === Role.ADMIN &&
        existingUser.status === UserStatus.ACTIVE &&
        status !== UserStatus.ACTIVE
      ) {
        const adminCount = await dependencies.users.countActiveAdmins();

        if (adminCount <= 1) {
          throw new AppError(409, "Cannot deactivate the last active admin.");
        }
      }

      const updatedUser = await dependencies.users.updateStatus(id, status);

      return {
        user: sanitizeUser(updatedUser),
      };
    },
  };
}

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const usersService = createUsersService({
  users: {
    async findById(id) {
      return prisma.user.findUnique({
        where: { id },
        select: userSelect,
      });
    },
    async list(query) {
      const where = {
        ...(query.role ? { role: query.role } : {}),
        ...(query.status ? { status: query.status } : {}),
      };
      const skip = ((query.page ?? 1) - 1) * (query.limit ?? 10);
      const take = query.limit ?? 10;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take,
          select: userSelect,
        }),
        prisma.user.count({ where }),
      ]);

      return { users, total };
    },
    async countActiveAdmins() {
      return prisma.user.count({
        where: {
          role: Role.ADMIN,
          status: UserStatus.ACTIVE,
        },
      });
    },
    async updateRole(id, role) {
      return prisma.user.update({
        where: { id },
        data: { role },
        select: userSelect,
      });
    },
    async updateStatus(id, status) {
      return prisma.user.update({
        where: { id },
        data: { status },
        select: userSelect,
      });
    },
  },
});
