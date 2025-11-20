// src/Routes/forgotPasswordRoutes.js
import express from "express";
import { requestPasswordReset, requestPasswordResetToken, resetPassword, resetPasswordWithToken } from "../Controllers/forgotPasswordController.js";

const router = express.Router();

// Step 1: Request OTP (new system)
router.post("/request", requestPasswordReset);

// Legacy: Request reset token (old system)
router.post("/request-token", requestPasswordResetToken);

// Step 2: Reset password with OTP (new system)
router.post("/reset", resetPassword);

// Legacy: Reset password with token (for backward compatibility)
router.post("/reset/:token", resetPasswordWithToken);

export default router;
