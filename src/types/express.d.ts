import type { CurrentUser } from "./common";

declare global {
  namespace Express {
    interface Request {
      user?: CurrentUser;
    }
  }
}

export {};
