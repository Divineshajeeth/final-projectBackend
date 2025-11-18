import express from "express";
import { createSupplierPayment, getSupplierPayments } from "../Controllers/supplierPaymentController.js";
import { protect, admin } from "../Middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", protect, admin, createSupplierPayment);
router.get("/", protect, admin, getSupplierPayments);

export default router;
