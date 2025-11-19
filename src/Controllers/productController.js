import asyncHandler from "express-async-handler";
import Product from "../Models/productModel.js";

/**
 * @desc    Get all products
 * @route   GET /api/products
 * @access  Public
 */
export const getProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({});
  res.json(products);
});

/**
 * @desc    Get single product by ID
 * @route   GET /api/products/:id
 * @access  Public
 */
export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    res.json(product);
  } else {
    res.status(404);
    throw new Error("Product not found");
  }
});




export const createProduct = asyncHandler(async (req, res) => {
  const { name, description, price, unit, size } = req.body;

  if (!name || !price) {
    res.status(400);
    throw new Error("Name and price are required");
  }

  // Handle image file if uploaded
  let imagePath = null;
  if (req.file) {
    imagePath = `/uploads/products/${req.file.filename}`;
  }

  const product = new Product({
    name,
    description,
    price,
    unit: unit || size, // Use unit from frontend, fallback to size
    size: size || unit, // Keep backward compatibility
    image: imagePath
  });

  const createdProduct = await product.save();
  res.status(201).json(createdProduct);
});


/**
 * @desc    Update an existing product
 * @route   PUT /api/products/:id
 * @access  Private/Admin
 */
export const updateProduct = asyncHandler(async (req, res) => {
  const { name, description, price, size, unit } = req.body;
  
  console.log("=== UPDATE PRODUCT ===");
  console.log("Product ID:", req.params.id);
  console.log("Request body:", { name, description, price, size, unit });
  console.log("File uploaded:", req.file ? req.file.filename : 'No file');

  const product = await Product.findById(req.params.id);

  if (product) {
    // Update basic fields
    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price || product.price;
    
    // Handle both size and unit fields for backward compatibility
    if (size !== undefined) product.size = size;
    if (unit !== undefined) product.unit = unit;
    
    // Handle image update
    if (req.file) {
      product.image = `/uploads/products/${req.file.filename}`;
    }

    const updatedProduct = await product.save();
    console.log("✅ Product updated successfully:", updatedProduct._id);
    res.json(updatedProduct);
  } else {
    console.log("❌ Product not found:", req.params.id);
    res.status(404);
    throw new Error("Product not found");
  }
});

/**
 * @desc    Delete a product
 * @route   DELETE /api/products/:id
 * @access  Private/Admin
 */
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    await product.deleteOne();
    res.json({ message: "Product removed" });
  } else {
    res.status(404);
    throw new Error("Product not found");
  }
});
