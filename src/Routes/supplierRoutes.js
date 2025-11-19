import express from "express";
import { protect } from "../Middlewares/authMiddleware.js";
import {
  createSupplier,
  getSuppliers,
  updateSupplier,
  deleteSupplier
} from "../Controllers/supplierController.js";

const router = express.Router();

// Create supplier (only suppliers can create)
router.post("/", protect, createSupplier);

// Get suppliers (admin gets all, supplier gets own data)
router.get("/", protect, getSuppliers);

// Update supplier by ID
router.put("/:id", protect, updateSupplier);

// Delete supplier by ID
router.delete("/:id", protect, deleteSupplier);

export default router;
