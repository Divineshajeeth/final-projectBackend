import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../Models/userModel.js";

export const protect = asyncHandler(async (req, res, next) => {
  console.log("=== AUTH MIDDLEWARE ===");
  console.log("Request URL:", req.originalUrl);
  console.log("Authorization header:", req.headers.authorization ? 'Bearer [TOKEN]' : 'Missing');
  
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      console.log("Token extracted successfully");
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Token verified, decoded ID:", decoded.id);
      
      req.user = await User.findById(decoded.id).select("-password");
      
      if (!req.user) {
        console.log("❌ User not found for ID:", decoded.id);
        res.status(401);
        throw new Error("User not found");
      }
      
      console.log("✅ User authenticated:", {
        id: req.user._id,
        email: req.user.email,
        role: req.user.role
      });
      
      next();
    } catch (error) {
      console.log("❌ Authentication error:", error.message);
      res.status(401);
      throw new Error("Not authorized, token failed");
    }
  } else {
    console.log("❌ No authorization header or wrong format");
    res.status(401);
    throw new Error("Not authorized, no token");
  }
});

export const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") next();
  else {
    res.status(403);
    throw new Error("Not authorized as an admin");
  }
};
