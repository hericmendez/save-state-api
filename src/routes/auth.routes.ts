import { Router } from "express";
import { login, logout, me, register } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import { rateLimit } from "../middleware/rate-limit.middleware";
import { loginSchema, registerSchema } from "../schemas/auth.schema";

const router = Router();

const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

router.post("/auth/register", authRateLimit, validate({ body: registerSchema }), register);
router.post("/auth/login", authRateLimit, validate({ body: loginSchema }), login);
router.get("/auth/me", requireAuth, me);
router.post("/logout", logout);

export default router;
