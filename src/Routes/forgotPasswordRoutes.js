// src/Routes/forgotPasswordRoutes.js
import express from "express";
import { requestPasswordReset, resetPassword } from "../Controllers/forgotPasswordController.js";

const router = express.Router();

// Step 1: Request reset link
router.post("/request", requestPasswordReset);

// Step 2: Reset password
router.post("/reset/:token", resetPassword);

export default router;


// import express from "express";
// import {
//   requestPasswordReset,
//   resetPassword,
// } from "../Controllers/forgotPasswordController.js";

// const router = express.Router();

// // Send OTP
// router.post("/send-otp", requestPasswordReset);

// // Verify OTP + Reset Password
// router.post("/reset", resetPassword);

// export default router;  


