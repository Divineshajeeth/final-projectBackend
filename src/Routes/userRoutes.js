import express from "express";
import { registerUser, registerSupplier, authUser, getUserProfile, getAdminDashboard, getAllUsers, deleteUser, updateUserRole, updateUserProfile } from "../Controllers/userController.js";
import { protect, admin } from "../Middlewares/authMiddleware.js";
import { validateUserRegistration, validateRequestBody } from "../Middlewares/requestValidationMiddleware.js";
import User from "../Models/userModel.js";

const router = express.Router();

// Debug route to check existing users (temporary for debugging)
router.get("/debug/users", async (req, res) => {
  try {
    const users = await User.find().select("email name role createdAt").sort({ createdAt: -1 });
    const usersByRole = {
      total: users.length,
      buyers: users.filter(u => u.role === 'buyer').length,
      suppliers: users.filter(u => u.role === 'supplier').length,
      admins: users.filter(u => u.role === 'admin').length
    };
    res.json({
      success: true,
      count: users.length,
      usersByRole,
      users: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message
    });
  }
});

// Public routes
router.post("/register", validateRequestBody, validateUserRegistration, registerUser);
router.post("/register-supplier", validateRequestBody, registerSupplier);
router.post("/login", validateRequestBody, authUser);

// Protected routes
router.get("/profile", protect, getUserProfile);
router.put("/:id", protect, updateUserProfile);

// Admin only routes
router.get("/admin/dashboard", protect, admin, getAdminDashboard);
router.get("/admin/users", protect, admin, getAllUsers);
router.delete("/admin/users/:id", protect, admin, deleteUser);
router.put("/admin/users/:id/role", protect, admin, updateUserRole);

export default router;
