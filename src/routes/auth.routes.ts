import { Router } from "express";
import { login, logout, me, register } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import { loginSchema, registerSchema } from "../schemas/auth.schema";

const router = Router();

router.post("/auth/register", validate({ body: registerSchema }), register);
router.post("/auth/login", validate({ body: loginSchema }), login);
router.get("/auth/me", requireAuth, me);
router.post("/logout", logout);

export default router;
