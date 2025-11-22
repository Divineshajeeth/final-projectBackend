import express from "express";
import { protect } from "../Middlewares/authMiddleware.js";
import {
  createSupplier,
  getSuppliers,
  getMyDeliveries,
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

// Get my deliveries (supplier only)
router.get("/my-deliveries", protect, getMyDeliveries);

// Get supplier statistics (admin only)
router.get("/stats", protect, getSupplierStats);

// Update supplier by ID
router.put("/:id", protect, updateSupplier);

// Update delivery status by ID (admin only)
router.patch("/:id/status", protect, updateDeliveryStatus);

// Delete supplier by ID
router.delete("/:id", protect, deleteSupplier);

export default router;
