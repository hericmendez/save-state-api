import { Router } from "express";
import {
  login,
  logout,
  me,
  register,
  forgotPasswordHandler,
  resetPasswordHandler,
  updateMe,
  changePasswordHandler,
} from "../controllers/auth.controller";
import { exportUserData, exportUserDataCsv } from "../controllers/export.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import { rateLimit } from "../middleware/rate-limit.middleware";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateMeSchema,
  changePasswordSchema,
} from "../schemas/auth.schema";

const router = Router();

const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const forgotPasswordRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
const resetPasswordRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
const changePasswordRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });

router.post("/auth/register", authRateLimit, validate({ body: registerSchema }), register);
router.post("/auth/login", authRateLimit, validate({ body: loginSchema }), login);
router.get("/auth/me", requireAuth, me);
router.patch("/auth/me", requireAuth, validate({ body: updateMeSchema }), updateMe);
router.post(
  "/auth/change-password",
  requireAuth,
  changePasswordRateLimit,
  validate({ body: changePasswordSchema }),
  changePasswordHandler,
);
router.get("/auth/export", requireAuth, exportUserData);
router.get("/auth/export/csv", requireAuth, exportUserDataCsv);
router.post("/logout", logout);

router.post(
  "/auth/forgot-password",
  forgotPasswordRateLimit,
  validate({ body: forgotPasswordSchema }),
  forgotPasswordHandler,
);

router.post(
  "/auth/reset-password",
  resetPasswordRateLimit,
  validate({ body: resetPasswordSchema }),
  resetPasswordHandler,
);

export default router;
