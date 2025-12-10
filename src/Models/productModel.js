

import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    currency: { type: String, default: "LKR", enum: ["LKR", "USD", "EUR", "INR"] },
    size: { type: String },
    unit: { type: String }, // Added to match frontend 'unit' field
    image: { type: String }, // Added to store image path/URL
  },
  { timestamps: true }
);

// Add indexes for better performance
productSchema.index({ name: "text" }); // For text search
productSchema.index({ price: 1 }); // For price sorting/filtering
productSchema.index({ createdAt: -1 }); // For sorting by creation date

const Product = mongoose.model("Product", productSchema);
export default Product;
