import asyncHandler from "express-async-handler";
import Supplier from "../Models/supplierModel.js";

// Create Supplier - Only suppliers can create
export const createSupplier = asyncHandler(async (req, res) => {
  if (req.user.role !== "supplier") {
    res.status(403);
    throw new Error("Only suppliers can create supplier details");
  }

  const { name, bottleSize, bottleCount, contactNo, notes } = req.body;

  // Validation
  if (!name || !bottleSize || !bottleCount || !contactNo) {
    res.status(400);
    throw new Error("All fields are required: name, bottleSize, bottleCount, contactNo");
  }

  // Create supplier with fixed bottle price of ₹1 and user association
  const supplier = await Supplier.create({
    name: name.trim(),
    bottleSize: bottleSize.trim(),
    bottleCount: Number(bottleCount),
    contactNo: contactNo.trim(),
    notes: notes?.trim() || "",
    bottlePrice: 1, // Fixed at ₹1 per bottle
    user: req.user._id, // Associate with the logged-in user
    deliveryDate: new Date(), // Set delivery date to now
    deliveryStatus: 'pending' // Default status
  });

  // Populate user information for response
  await supplier.populate('user', 'name email');

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

  console.log(`📋 Fetching suppliers for user: ${req.user._id}, role: ${req.user.role}`);

  // Both admin and suppliers can see all suppliers
  const suppliers = await Supplier.find({})
    .populate('user', 'name email _id')
    .sort({ createdAt: -1 });

  console.log(`✅ Found ${suppliers.length} suppliers`);
  
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

// Update Delivery Status - Only admin can update status
export const updateDeliveryStatus = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Only admin can update delivery status");
  }

  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'in_transit', 'delivered', 'cancelled'];

  if (!validStatuses.includes(status)) {
    res.status(400);
    throw new Error("Invalid status. Must be one of: " + validStatuses.join(', '));
  }

  const supplier = await Supplier.findById(req.params.id);

  if (!supplier) {
    res.status(404);
    throw new Error("Supplier not found");
  }

  // Update status and timestamps
  supplier.deliveryStatus = status;
  
  if (status === 'confirmed' && !supplier.confirmedDate) {
    supplier.confirmedDate = new Date();
  } else if (status === 'delivered' && !supplier.deliveredDate) {
    supplier.deliveredDate = new Date();
  }

  const updated = await supplier.save();
  await updated.populate('user', 'name email');

  res.json({
    success: true,
    data: updated,
    message: `Delivery status updated to ${status}`
  });
});

// Get Supplier Statistics - Admin only
export const getSupplierStats = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Only admin can view supplier statistics");
  }

  const stats = await Supplier.aggregate([
    {
      $group: {
        _id: null,
        totalSuppliers: { $sum: 1 },
        totalBottles: { $sum: '$bottleCount' },
        totalValue: { $sum: { $multiply: ['$bottleCount', '$bottlePrice'] } },
        pending: {
          $sum: { $cond: [{ $eq: ['$deliveryStatus', 'pending'] }, 1, 0] }
        },
        confirmed: {
          $sum: { $cond: [{ $eq: ['$deliveryStatus', 'confirmed'] }, 1, 0] }
        },
        inTransit: {
          $sum: { $cond: [{ $eq: ['$deliveryStatus', 'in_transit'] }, 1, 0] }
        },
        delivered: {
          $sum: { $cond: [{ $eq: ['$deliveryStatus', 'delivered'] }, 1, 0] }
        },
        cancelled: {
          $sum: { $cond: [{ $eq: ['$deliveryStatus', 'cancelled'] }, 1, 0] }
        }
      }
    }
  ]);

  const result = stats[0] || {
    totalSuppliers: 0,
    totalBottles: 0,
    totalValue: 0,
    pending: 0,
    confirmed: 0,
    inTransit: 0,
    delivered: 0,
    cancelled: 0
  };

  res.json({
    success: true,
    data: result
  });
});
