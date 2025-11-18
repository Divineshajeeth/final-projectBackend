import asyncHandler from "express-async-handler";
import Supplier from "../Models/supplierModel.js";
// import AuthenticatedAPI from "./authenticated";


// Create Supplier Info
export const createSupplier = asyncHandler(async (req, res) => {
  console.log("=== CREATE SUPPLIER REQUEST ===");
  console.log("User:", req.user);
  console.log("User role:", req.user?.role);
  console.log("Request body:", req.body);
  console.log("Content-Type:", req.headers['content-type']);
  
  if (req.user.role !== "supplier") {
    console.log("❌ Role validation failed - User role:", req.user.role);
    res.status(403);
    throw new Error("Only suppliers can create supplier details");
  }

  const { name, bottleNo, contactNo, bottlePrice } = req.body;

  console.log("Extracted data:", { name, bottleNo, contactNo, bottlePrice });
  console.log("Data types:", {
    name: typeof name,
    bottleNo: typeof bottleNo,
    contactNo: typeof contactNo,
    bottlePrice: typeof bottlePrice
  });

  // Enhanced validation with detailed error messages
  const validationErrors = [];
  
  if (!name) {
    validationErrors.push("Name is required");
  } else if (typeof name !== 'string') {
    validationErrors.push("Name must be a string");
  } else if (name.trim().length < 2) {
    validationErrors.push("Name must be at least 2 characters long");
  }
  
  if (!bottleNo) {
    validationErrors.push("Bottle number is required");
  } else if (isNaN(bottleNo)) {
    validationErrors.push("Bottle number must be a valid number");
  } else if (Number(bottleNo) <= 0) {
    validationErrors.push("Bottle number must be greater than 0");
  }
  
  if (!contactNo) {
    validationErrors.push("Contact number is required");
  } else if (typeof contactNo !== 'string') {
    validationErrors.push("Contact number must be a string");
  } else if (contactNo.trim().length < 5) {
    validationErrors.push("Contact number must be at least 5 characters long");
  }

  if (validationErrors.length > 0) {
    console.log("❌ Validation errors:", validationErrors);
    res.status(400);
    throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
  }

  // Check if supplier already exists for this user
  console.log("Checking for existing supplier for user:", req.user._id);
  const existingSupplier = await Supplier.findOne({ user: req.user._id });
  if (existingSupplier) {
    console.log("❌ Supplier already exists for user:", req.user._id);
    res.status(400);
    throw new Error("Supplier profile already exists for this user");
  }

  try {
    const supplier = await Supplier.create({
      name: name.trim(),
      bottleNo: Number(bottleNo),
      contactNo: contactNo.trim(),
      bottlePrice: bottlePrice ? Number(bottlePrice) : 1,
      user: req.user._id
    });

    console.log("✅ Supplier created successfully:", supplier);
    res.status(201).json({
      success: true,
      data: supplier
    });
  } catch (error) {
    console.log("❌ Database error creating supplier:", error.message);
    res.status(400);
    throw new Error(`Failed to create supplier: ${error.message}`);
  }
});

// Get logged-in supplier's data
export const getSuppliers = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "supplier") {
    res.status(403);
    throw new Error("Not allowed");
  }

  // Admin → get all suppliers
  if (req.user.role === "admin") {
    const suppliers = await Supplier.find({});
    return res.json(suppliers);
  }

  // Supplier → get only own data
  const supplier = await Supplier.findOne({ user: req.user._id });
  res.json(supplier);
});

// Get current user's supplier profile (for frontend to determine create vs edit)
export const getMySupplierProfile = asyncHandler(async (req, res) => {
  if (req.user.role !== "supplier") {
    res.status(403);
    throw new Error("Only suppliers can access their profile");
  }

  const supplier = await Supplier.findOne({ user: req.user._id });
  
  if (!supplier) {
    return res.status(404).json({
      success: false,
      message: "No supplier profile found",
      hasProfile: false
    });
  }

  res.json({
    success: true,
    data: supplier,
    hasProfile: true
  });
});

// Update supplier
export const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);

  if (!supplier) {
    res.status(404);
    throw new Error("Supplier not found");
  }

  // Supplier → can edit only their own details
  if (req.user.role === "supplier" && supplier.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("You can update only your own details");
  }

  // Admin → can edit any supplier
  supplier.name = req.body.name || supplier.name;
  supplier.bottleNo = req.body.bottleNo || supplier.bottleNo;
  supplier.contactNo = req.body.contactNo || supplier.contactNo;
  supplier.bottlePrice = req.body.bottlePrice || supplier.bottlePrice;

  const updated = await supplier.save();

  res.json({
    success: true,
    data: updated
  });
});

// Unified create or update supplier profile
export const saveOrUpdateSupplierProfile = asyncHandler(async (req, res) => {
  console.log("=== SAVE OR UPDATE SUPPLIER PROFILE REQUEST ===");
  console.log("User:", req.user);
  console.log("User role:", req.user?.role);
  console.log("Request body:", req.body);
  console.log("Content-Type:", req.headers['content-type']);
  
  if (req.user.role !== "supplier") {
    console.log("❌ Role validation failed - User role:", req.user.role);
    res.status(403);
    throw new Error("Only suppliers can save supplier details");
  }

  const { name, bottleNo, contactNo, bottlePrice } = req.body;

  console.log("Extracted data:", { name, bottleNo, contactNo, bottlePrice });
  console.log("Data types:", {
    name: typeof name,
    bottleNo: typeof bottleNo,
    contactNo: typeof contactNo,
    bottlePrice: typeof bottlePrice
  });

  // Enhanced validation with detailed error messages
  const validationErrors = [];
  
  if (!name) {
    validationErrors.push("Name is required");
  } else if (typeof name !== 'string') {
    validationErrors.push("Name must be a string");
  } else if (name.trim().length < 2) {
    validationErrors.push("Name must be at least 2 characters long");
  }
  
  if (!bottleNo) {
    validationErrors.push("Bottle number is required");
  } else if (isNaN(bottleNo)) {
    validationErrors.push("Bottle number must be a valid number");
  } else if (Number(bottleNo) <= 0) {
    validationErrors.push("Bottle number must be greater than 0");
  }
  
  if (!contactNo) {
    validationErrors.push("Contact number is required");
  } else if (typeof contactNo !== 'string') {
    validationErrors.push("Contact number must be a string");
  } else if (contactNo.trim().length < 5) {
    validationErrors.push("Contact number must be at least 5 characters long");
  }

  if (validationErrors.length > 0) {
    console.log("❌ Validation errors:", validationErrors);
    res.status(400);
    throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
  }

  // Check if supplier already exists for this user
  console.log("Checking for existing supplier for user:", req.user._id);
  let supplier = await Supplier.findOne({ user: req.user._id });

  try {
    if (supplier) {
      console.log("Updating existing supplier:", supplier._id);
      // Update existing supplier
      supplier.name = name.trim();
      supplier.bottleNo = Number(bottleNo);
      supplier.contactNo = contactNo.trim();
      supplier.bottlePrice = bottlePrice ? Number(bottlePrice) : supplier.bottlePrice;
      
      const updated = await supplier.save();
      console.log("✅ Supplier updated successfully:", updated);
      
      res.json({
        success: true,
        data: updated,
        action: "updated"
      });
    } else {
      console.log("Creating new supplier for user:", req.user._id);
      // Create new supplier
      const newSupplier = await Supplier.create({
        name: name.trim(),
        bottleNo: Number(bottleNo),
        contactNo: contactNo.trim(),
        bottlePrice: bottlePrice ? Number(bottlePrice) : 1,
        user: req.user._id
      });

      console.log("✅ Supplier created successfully:", newSupplier);
      res.status(201).json({
        success: true,
        data: newSupplier,
        action: "created"
      });
    }
  } catch (error) {
    console.log("❌ Database error:", error.message);
    res.status(400);
    throw new Error(`Failed to save supplier: ${error.message}`);
  }
});
