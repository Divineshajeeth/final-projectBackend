import express from "express";
import { createUserPayment, getUserPayments } from "../Controllers/userPaymentController.js";
import { protect, admin } from "../Middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createUserPayment);
router.get("/:userId", protect, getUserPayments);
router.get("/", protect, admin, async (req, res) => {
  // optional admin listing - quick implementation
  res.status(200).json({ msg: "implement listing if needed" });
});

export default router;
