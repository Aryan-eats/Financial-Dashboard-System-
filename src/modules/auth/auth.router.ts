import { Router } from "express";

import { validate } from "../../middleware/validate";
import { authController } from "./auth.controller";
import { loginSchema, registerSchema } from "./auth.schema";

export const authRouter = Router();

authRouter.post("/register", validate(registerSchema), authController.register);
authRouter.post("/login", validate(loginSchema), authController.login);
