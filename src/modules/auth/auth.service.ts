import { Role, UserStatus } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import * as defaultJwtService from "../../utils/jwt";
import * as defaultPasswordService from "../../utils/password";
import type { LoginInput, RegisterInput } from "./auth.schema";

export interface AuthUserRecord {
  id: string;
  email: string;
  name: string;
  password: string;
  role: Role;
  status: UserStatus;
  createdAt: Date;
}

interface AuthUserCreateInput {
  email: string;
  name: string;
  password: string;
  role: Role;
  status: UserStatus;
}

interface AuthRepository {
  findByEmail(email: string): Promise<AuthUserRecord | null>;
  create(data: AuthUserCreateInput): Promise<AuthUserRecord>;
}

interface AuthDependencies {
  users: AuthRepository;
  password: {
    hashPassword(password: string): Promise<string>;
    comparePassword(password: string, hash: string): Promise<boolean>;
  };
  jwt: {
    signToken(payload: { userId: string; role: Role }): string;
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function sanitizeUser(user: AuthUserRecord) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  };
}

export function createAuthService(dependencies: AuthDependencies) {
  return {
    async register(input: RegisterInput) {
      const email = normalizeEmail(input.email);
      const existingUser = await dependencies.users.findByEmail(email);

      if (existingUser) {
        throw new AppError(409, "Email is already registered.");
      }

      const hashedPassword = await dependencies.password.hashPassword(input.password);
      const user = await dependencies.users.create({
        email,
        name: input.name.trim(),
        password: hashedPassword,
        role: Role.VIEWER,
        status: UserStatus.ACTIVE,
      });

      return {
        user: sanitizeUser(user),
        token: dependencies.jwt.signToken({
          userId: user.id,
          role: user.role,
        }),
      };
    },

    async login(input: LoginInput) {
      const email = normalizeEmail(input.email);
      const user = await dependencies.users.findByEmail(email);

      if (!user) {
        throw new AppError(401, "Invalid credentials.");
      }

      const passwordMatches = await dependencies.password.comparePassword(
        input.password,
        user.password,
      );

      if (!passwordMatches) {
        throw new AppError(401, "Invalid credentials.");
      }

      if (user.status !== UserStatus.ACTIVE) {
        throw new AppError(403, "User account is inactive.");
      }

      return {
        user: sanitizeUser(user),
        token: dependencies.jwt.signToken({
          userId: user.id,
          role: user.role,
        }),
      };
    },
  };
}

const prismaAuthRepository: AuthRepository = {
  async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  },
  async create(data) {
    return prisma.user.create({
      data,
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  },
};

export const authService = createAuthService({
  users: prismaAuthRepository,
  password: defaultPasswordService,
  jwt: defaultJwtService,
});
