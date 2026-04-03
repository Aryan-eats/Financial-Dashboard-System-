import { Role, UserStatus } from "@prisma/client";

export interface CurrentUser {
  userId: string;
  role: Role;
  status: UserStatus;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
