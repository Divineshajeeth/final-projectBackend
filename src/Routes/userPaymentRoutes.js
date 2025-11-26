import express from "express";
import { 
  processCashPayment,
  getOrderPayment, 
  getUserPayments, 
  getAllPayments, 
  updatePaymentStatus,
  createUserPayment,
  createStripePaymentIntent,
  confirmStripePayment,
  stripeWebhook
} from "../Controllers/userPaymentController.js";
import { protect, admin } from "../Middlewares/authMiddleware.js";

const router = express.Router();

// Process cash payment for an order
router.post("/cash", protect, processCashPayment);

// Create payment record (legacy endpoint - now cash only)
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

// Stripe Payment Routes
// Create Stripe Payment Intent
router.post("/stripe/create-intent", protect, createStripePaymentIntent);

// Confirm Stripe Payment
router.post("/stripe/confirm", protect, confirmStripePayment);

// Stripe Webhook (no auth required - Stripe authenticates via signature)
router.post("/stripe/webhook", stripeWebhook);

export default router;
