import asyncHandler from "express-async-handler";
import User from "../Models/userModel.js";
import Supplier from "../Models/supplierModel.js";
import generateToken from "../Utils/generateToken.js";

// @desc    Register user
// @route   POST /api/users/register
// @access  Public
export const registerUser = asyncHandler(async (req, res) => {
  // Debug logging
  console.log("=== REGISTER REQUEST DEBUG ===");
  console.log("Request headers:", req.headers);
  console.log("Request body:", req.body);
  console.log("Content-Type:", req.headers['content-type']);

  const { name, email, password, role } = req.body;

  // Debug individual fields
  console.log("Extracted fields - name:", name, "email:", email, "password:", password ? "***" : "undefined", "role:", role);

  // Enhanced input validation with specific error messages
  const validationErrors = {};
  const missingFields = [];

  if (!name || name.trim() === '') {
    missingFields.push("name");
    validationErrors.name = "Name is required";
  }
  if (!email || email.trim() === '') {
    missingFields.push("email");
    validationErrors.email = "Email is required";
  }
  if (!password || password.trim() === '') {
    missingFields.push("password");
    validationErrors.password = "Password is required";
  }

  if (missingFields.length > 0) {
    console.log("Missing fields:", missingFields);
    res.status(400);
    const error = new Error(`Please provide all required fields. Missing: ${missingFields.join(", ")}`);
    error.validationErrors = validationErrors;
    error.missingFields = missingFields;
    throw error;
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400);
    const error = new Error("Please provide a valid email address");
    error.validationErrors = { email: "Please enter a valid email address" };
    throw error;
  }

  // Password validation
  if (password.length < 6) {
    res.status(400);
    const error = new Error("Password must be at least 6 characters long");
    error.validationErrors = { password: "Password must be at least 6 characters long" };
    throw error;
  }

  // Name validation
  if (name.trim().length < 2) {
    res.status(400);
    const error = new Error("Name must be at least 2 characters long");
    error.validationErrors = { name: "Name must be at least 2 characters long" };
    throw error;
  }

  // Role validation
  const validRoles = ["buyer", "admin", "supplier"];
  if (role && !validRoles.includes(role)) {
    res.status(400);
    const error = new Error("Invalid role. Must be: buyer, admin, or supplier");
    error.validationErrors = { role: "Invalid role selected" };
    throw error;
  }

  console.log("Attempting to register user:", { name, email, role });

  // Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    const error = new Error("User with this email already exists");
    error.validationErrors = { email: "This email is already registered" };
    throw error;
  }



  // ✅ AUTO ADMIN LOGIC HERE
  let userRole = role || "buyer";
  if (email.toLowerCase().trim() === "shajeethshajeeth5@gmail.com") {
    userRole = "admin"; // this email always becomes admin
  }

  // Create user
  try {
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role:/*role*/ userRole, /*|| "buyer"*/
    });

    console.log("User created successfully:", user._id);

    if (user) {
      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          token: generateToken(user._id)
        }
      });
    } else {
      res.status(400);
      throw new Error("Failed to create user");
    }
  } catch (error) {
    console.error("User creation error:", error);
    res.status(500);
    throw new Error("Error creating user: " + error.message);
  }
});

// @desc    Register supplier (combined user + supplier creation)
// @route   POST /api/users/register-supplier
// @access  Public
export const registerSupplier = asyncHandler(async (req, res) => {
  console.log("=== SUPPLIER REGISTER REQUEST DEBUG ===");
  console.log("Request body:", req.body);

  const { 
    // User fields
    name, 
    email, 
    password,
    // Supplier fields
    bottleNo, 
    contactNo, 
    bottlePrice 
  } = req.body;

  // Validate required user fields
  const missingUserFields = [];
  if (!name) missingUserFields.push("name");
  if (!email) missingUserFields.push("email");
  if (!password) missingUserFields.push("password");

  if (missingUserFields.length > 0) {
    res.status(400);
    throw new Error(`Please provide all required user fields. Missing: ${missingUserFields.join(", ")}`);
  }

  // Validate required supplier fields
  const missingSupplierFields = [];
  if (!bottleNo) missingSupplierFields.push("bottleNo");
  if (!contactNo) missingSupplierFields.push("contactNo");

  if (missingSupplierFields.length > 0) {
    res.status(400);
    throw new Error(`Please provide all required supplier fields. Missing: ${missingSupplierFields.join(", ")}`);
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400);
    throw new Error("Please provide a valid email address");
  }

  // Password validation
  if (password.length < 6) {
    res.status(400);
    throw new Error("Password must be at least 6 characters long");
  }

  // Name validation
  if (name.trim().length < 2) {
    res.status(400);
    throw new Error("Name must be at least 2 characters long");
  }

  // Bottle number validation
  if (isNaN(bottleNo) || bottleNo <= 0) {
    res.status(400);
    throw new Error("Bottle number must be a positive number");
  }

  // Contact number validation
  if (contactNo.trim().length < 10) {
    res.status(400);
    throw new Error("Contact number must be at least 10 characters long");
  }

  console.log("Attempting to register supplier:", { name, email, bottleNo, contactNo });

  try {
    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error("User with this email already exists");
    }

    // Create user with supplier role
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: "supplier"
    });

    console.log("User created successfully:", user._id);

    if (!user) {
      res.status(400);
      throw new Error("Failed to create user");
    }

    // Create supplier profile linked to the user
    const supplier = await Supplier.create({
      name: name.trim(),
      bottleNo: Number(bottleNo),
      contactNo: contactNo.trim(),
      bottlePrice: bottlePrice ? Number(bottlePrice) : 1,
      user: user._id
    });

    console.log("Supplier profile created successfully:", supplier._id);

    if (!supplier) {
      // Rollback user creation if supplier creation fails
      await User.findByIdAndDelete(user._id);
      res.status(400);
      throw new Error("Failed to create supplier profile");
    }

    // Return success response with token
    res.status(201).json({
      success: true,
      message: "Supplier registered successfully",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        supplier: {
          _id: supplier._id,
          name: supplier.name,
          bottleNo: supplier.bottleNo,
          contactNo: supplier.contactNo,
          bottlePrice: supplier.bottlePrice
        },
        token: generateToken(user._id)
      }
    });

  } catch (error) {
    console.error("Supplier registration error:", error);
    
    // Clean up any partially created data
    if (req.body.email) {
      const user = await User.findOne({ email: req.body.email.toLowerCase().trim() });
      if (user) {
        await User.findByIdAndDelete(user._id);
        await Supplier.findOneAndDelete({ user: user._id });
      }
    }
    
    res.status(500);
    throw new Error("Error registering supplier: " + error.message);
  }
});

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
export const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Input validation
  if (!email || !password) {
    res.status(400);
    throw new Error("Please provide both email and password");
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400);
    throw new Error("Please provide a valid email address");
  }

  console.log("Login attempt for email:", email);

  try {
    const user = await User.findOne({ email });

    if (!user) {
      console.log("User not found:", email);
      res.status(401);
      throw new Error("Invalid email or password");
    }

    const isPasswordMatch = await user.matchPassword(password);

    if (!isPasswordMatch) {
      console.log("Password mismatch for email:", email);
      res.status(401);
      throw new Error("Invalid email or password");
    }

    console.log("User logged in successfully:", user._id);

    res.json({
      success: true,
      message: "Login successful",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  res.json(user);
});

// @desc    Get admin dashboard data
// @route   GET /api/users/admin/dashboard
// @access  Private/Admin
export const getAdminDashboard = asyncHandler(async (req, res) => {
  try {
    // Get user statistics
    const totalUsers = await User.countDocuments();
    const totalBuyers = await User.countDocuments({ role: "buyer" });
    const totalSuppliers = await User.countDocuments({ role: "supplier" });
    const totalAdmins = await User.countDocuments({ role: "admin" });

    // Get recent users (last 10)
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("-password");

    // Get users by role for chart data
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 }
        }
      }
    ]);

    // Get user registration trends (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const registrationTrend = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt"
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        statistics: {
          totalUsers,
          totalBuyers,
          totalSuppliers,
          totalAdmins
        },
        recentUsers,
        usersByRole,
        registrationTrend
      }
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500);
    throw new Error("Failed to fetch admin dashboard data");
  }
});

// @desc    Get all users with pagination and filtering
// @route   GET /api/users/admin/users
// @access  Private/Admin
export const getAllUsers = asyncHandler(async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 1000; // Increased limit to show all users
    const role = req.query.role;
    const search = req.query.search;

    // Build query
    const query = {};
    
    if (role && role !== 'all') {
      query.role = role;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const count = await User.countDocuments(query);
    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    console.log("📋 getAllUsers - Found users:", users.length, "Total count:", count);
    console.log("👤 Users by role:", {
      buyers: users.filter(u => u.role === 'buyer').length,
      suppliers: users.filter(u => u.role === 'supplier').length,
      admins: users.filter(u => u.role === 'admin').length
    });

    // Return users array directly for simpler frontend handling
    res.json(users);
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500);
    throw new Error("Failed to fetch users");
  }
});

// @desc    Delete a user
// @route   DELETE /api/users/admin/users/:id
// @access  Private/Admin
export const deleteUser = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      res.status(400);
      throw new Error("You cannot delete your own account");
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500);
    throw new Error("Failed to delete user");
  }
});

// @desc    Update user role
// @route   PUT /api/users/admin/users/:id/role
// @access  Private/Admin
export const updateUserRole = asyncHandler(async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!role || !["buyer", "admin", "supplier"].includes(role)) {
      res.status(400);
      throw new Error("Invalid role. Must be: buyer, admin, or supplier");
    }

    const user = await User.findById(req.params.id);
    
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    // Prevent admin from changing their own role
    if (user._id.toString() === req.user._id.toString()) {
      res.status(400);
      throw new Error("You cannot change your own role");
    }

    user.role = role;
    await user.save();

    res.json({
      success: true,
      message: "User role updated successfully",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500);
    throw new Error("Failed to update user role");
  }
});
