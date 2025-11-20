import express from "express";
import { protect } from "../Middlewares/authMiddleware.js";
import {
  createSupplier,
  getSuppliers,
  updateSupplier,
  deleteSupplier,
  updateDeliveryStatus,
  getSupplierStats
} from "../Controllers/supplierController.js";

const router = express.Router();

// Create supplier (only suppliers can create)
router.post("/", protect, createSupplier);

// Get suppliers (admin gets all, supplier gets own data)
router.get("/", protect, getSuppliers);

// Get supplier statistics (admin only)
router.get("/stats", protect, getSupplierStats);

// Update supplier by ID
router.put("/:id", protect, updateSupplier);

// Update delivery status by ID (admin only)
router.patch("/:id/status", protect, updateDeliveryStatus);

// Delete supplier by ID
router.delete("/:id", protect, deleteSupplier);

export default router;
