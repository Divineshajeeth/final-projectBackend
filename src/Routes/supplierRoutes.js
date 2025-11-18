import express from "express";
import { protect, admin } from "../Middlewares/authMiddleware.js";
import { validateRequestBody } from "../Middlewares/requestValidationMiddleware.js";
import {
  createSupplier,
  getSuppliers,
  getMySupplierProfile,
  updateSupplier,
  saveOrUpdateSupplierProfile
} from "../Controllers/supplierController.js";

const router = express.Router();

// User must be logged in (protect)
// Supplier create (only suppliers)
router.post("/", protect, validateRequestBody, createSupplier);

// Admin sees all, supplier sees only own data
router.get("/", protect, getSuppliers);

// Get current user's supplier profile (for frontend create/edit logic)
router.get("/my-profile", protect, getMySupplierProfile);

// Unified save or update supplier profile (handles both create and update)
router.put("/profile", protect, validateRequestBody, saveOrUpdateSupplierProfile);

// Update supplier details
router.put("/:id", protect, validateRequestBody, updateSupplier);

export default router;
