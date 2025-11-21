import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./Config/db.js";
import { notFound, errorHandler } from "./Middlewares/errorMiddleware.js"
import userRoutes from "./Routes/userRoutes.js";
import productRoutes from "./Routes/productRoutes.js";
import orderRoutes from "./Routes/orderRoutes.js";
import userPaymentRoutes from "./Routes/userPaymentRoutes.js";
import supplierPaymentRoutes from "./Routes/supplierPaymentRoutes.js";
import feedbackRoutes from "./Routes/feedbackRoutes.js";
import forgotPasswordRoutes from "./Routes/forgotPasswordRoutes.js";
import supplier from "./Routes/supplierRoutes.js";

dotenv.config();
const app = express();

// Connect DB
connectDB();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
// Add raw body capture for debugging
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// URL normalization middleware to handle double slashes and common typos
app.use((req, res, next) => {
  let normalizedUrl = req.url;
  
  // Skip processing for root path
  if (req.url === '/') {
    return next();
  }
  
  // Handle double slashes
  if (req.url.includes('//')) {
    normalizedUrl = req.url.replace(/\/+/g, '/');
  }
  
  // Handle common typos - redirect to correct endpoints
  if (normalizedUrl.includes('/api/suplier')) {
    normalizedUrl = normalizedUrl.replace('/api/suplier', '/api/suppliers');
    return res.redirect(301, normalizedUrl);
  }
  
  if (normalizedUrl !== req.url) {
    return res.redirect(301, normalizedUrl);
  }
  
  next();
});

if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

// Enhanced CORS configuration

app.use(cors({
  // origin: process.env.CORS_ORIGIN || "*",
  origin: "http://localhost:5181",
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
})



);

// Routes
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/suppliers", supplier)
app.use("/api/payments/users", userPaymentRoutes);
app.use("/api/payments/suppliers", supplierPaymentRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/password", forgotPasswordRoutes);

// Health
app.get("/", (req, res) => res.send("API is running..."));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

export default app;
