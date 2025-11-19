import asyncHandler from "express-async-handler";
import Supplier from "../Models/supplierModel.js";

// Create Supplier - Only suppliers can create
export const createSupplier = asyncHandler(async (req, res) => {
  if (req.user.role !== "supplier") {
    res.status(403);
    throw new Error("Only suppliers can create supplier details");
  }

  const { name, bottleSize, bottleCount, contactNo } = req.body;

  // Validation
  if (!name || !bottleSize || !bottleCount || !contactNo) {
    res.status(400);
    throw new Error("All fields are required: name, bottleSize, bottleCount, contactNo");
  }

  // Create supplier with fixed bottle price of ₹1
  const supplier = await Supplier.create({
    name: name.trim(),
    bottleSize: bottleSize.trim(),
    bottleCount: Number(bottleCount),
    contactNo: contactNo.trim(),
    bottlePrice: 1 // Fixed at ₹1 per bottle
  });

  res.status(201).json({
    success: true,
    data: supplier
  });
});

// Get Suppliers - Admin gets all, Supplier gets all (for now)
export const getSuppliers = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "supplier") {
    res.status(403);
    throw new Error("Access denied");
  }

  // Both admin and suppliers can see all suppliers
  const suppliers = await Supplier.find({}).sort({ createdAt: -1 });
  
  res.json({
    success: true,
    data: suppliers
  });
});

// Update Supplier by ID - Only admin can update
export const updateSupplier = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Only admin can update supplier details");
  }

  const supplier = await Supplier.findById(req.params.id);

  if (!supplier) {
    res.status(404);
    throw new Error("Supplier not found");
  }

  const { name, bottleSize, bottleCount, contactNo } = req.body;

  // Update allowed fields (bottlePrice cannot be changed)
  if (name) supplier.name = name.trim();
  if (bottleSize) supplier.bottleSize = bottleSize.trim();
  if (bottleCount) supplier.bottleCount = Number(bottleCount);
  if (contactNo) supplier.contactNo = contactNo.trim();

  const updated = await supplier.save();

  res.json({
    success: true,
    data: updated
  });
});

// Delete Supplier by ID - Only admin can delete
export const deleteSupplier = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Only admin can delete supplier profiles");
  }

  const supplier = await Supplier.findById(req.params.id);

  if (!supplier) {
    res.status(404);
    throw new Error("Supplier not found");
  }

  await Supplier.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: "Supplier deleted successfully"
  });
});
