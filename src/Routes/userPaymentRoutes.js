import express from "express";
import { 
  processPayment, 
  getOrderPayment, 
  getUserPayments, 
  getAllPayments, 
  updatePaymentStatus,
  createUserPayment 
} from "../Controllers/userPaymentController.js";
import { protect, admin } from "../Middlewares/authMiddleware.js";

const router = express.Router();

// Process payment for an order
router.post("/process", protect, processPayment);

// Create payment record (legacy endpoint)
router.post("/", protect, createUserPayment);

// Get payment details for a specific order
router.get("/order/:orderId", protect, getOrderPayment);

// Get all payments for a user
router.get("/user/:userId", protect, getUserPayments);

// Get current user's payments
router.get("/", protect, getUserPayments);

// Get all payments (admin only)
router.get("/admin/all", protect, admin, getAllPayments);

// Update payment status (admin only)
router.put("/:paymentId/status", protect, admin, updatePaymentStatus);

export default router;
