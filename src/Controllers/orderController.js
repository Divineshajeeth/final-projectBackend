import asyncHandler from "express-async-handler";
import Order from "../Models/orderModel.js";
import Product from "../Models/productModel.js";

// @desc Create new order
// @route POST /api/orders
// @access Private
export const addOrder = asyncHandler(async (req, res) => {
  console.log("📦 Order request body:", JSON.stringify(req.body, null, 2));
  
  // Handle both cartItems (from frontend) and orderItems (expected format)
  const cartItems = req.body.cartItems || req.body.orderItems;
  const buyerId = req.body.buyerId || req.body.user;
  
  const {
    shippingAddress,
    paymentMethod,
    itemsPrice: frontendItemsPrice,
    totalPrice
  } = req.body;

  // Validate order items
  if (!cartItems || cartItems.length === 0) {
    console.log("❌ No order items found");
    res.status(400);
    throw new Error("No order items - Please add items to your cart before placing an order");
  }

  // Calculate itemsPrice from cart items if not provided
  let calculatedItemsPrice = frontendItemsPrice;
  if (!calculatedItemsPrice) {
    calculatedItemsPrice = cartItems.reduce((total, item) => {
      // Use subtotal if available, otherwise calculate from price * quantity
      const itemTotal = item.subtotal || (item.price * item.quantity);
      return total + itemTotal;
    }, 0);
    console.log("💰 Calculated itemsPrice from cart items:", calculatedItemsPrice);
  }

  // Validate shipping address - be more flexible with the validation
  console.log("🏠 Shipping address received:", JSON.stringify(shippingAddress, null, 2));
  
  if (!shippingAddress) {
    console.log("❌ No shipping address provided");
    res.status(400);
    throw new Error("Shipping address is required");
  }
  
  // Check if shipping address has at least some basic information
  const hasValidAddress = shippingAddress.address || shippingAddress.street || shippingAddress.line1;
  const hasValidCity = shippingAddress.city || shippingAddress.town;
  
  console.log("🔍 Address validation:", { hasValidAddress, hasValidCity });
  
  if (!hasValidAddress || !hasValidCity) {
    console.log("❌ Incomplete shipping address:", shippingAddress);
    res.status(400);
    throw new Error("Complete shipping address is required (address and city)");
  }

  // Validate prices
  if (!totalPrice || totalPrice <= 0) {
    console.log("❌ Invalid totalPrice");
    res.status(400);
    throw new Error("Invalid total price - Please check your order total");
  }

  if (!calculatedItemsPrice || calculatedItemsPrice <= 0) {
    console.log("❌ Invalid itemsPrice");
    res.status(400);
    throw new Error("Invalid items price - Please check your cart items");
  }

  // Validate that totalPrice matches calculated itemsPrice (allowing for shipping/tax differences)
  const priceDifference = Math.abs(totalPrice - calculatedItemsPrice);
  if (priceDifference > 100) { // Allow reasonable difference for shipping/tax
    console.log("❌ Price mismatch - totalPrice:", totalPrice, "itemsPrice:", calculatedItemsPrice);
    res.status(400);
    throw new Error(`Price mismatch detected - Total: ${totalPrice}, Items: ${calculatedItemsPrice}`);
  }

  // Validate each order item and map to expected format
  const orderItems = cartItems.map(item => {
    const productId = item.product || item.productId;
    const quantity = item.qty || item.quantity;
    const price = item.price;

    if (!productId || !quantity || !price) {
      console.log("❌ Invalid order item:", item);
      res.status(400);
      throw new Error("Invalid order item - Each item must have a product, quantity, and price");
    }
    if (quantity <= 0) {
      console.log("❌ Invalid quantity:", quantity);
      res.status(400);
      throw new Error("Invalid quantity - All items must have a quantity greater than 0");
    }

    return {
      product: productId,
      qty: quantity,
      price: price,
      size: item.size || undefined
    };
  });

  try {
    const order = new Order({
      user: req.user._id,
      orderItems: orderItems,
      shippingAddress,
      paymentMethod: paymentMethod || "card",
      itemsPrice: calculatedItemsPrice,
      totalPrice
    });

    const createdOrder = await order.save();
    console.log("✅ Order created successfully:", createdOrder._id);

    // decrease stock
    for (const item of orderItems) {
      if (item.product) {
        const updatedProduct = await Product.findByIdAndUpdate(
          item.product, 
          { $inc: { stock: -item.qty } },
          { new: true }
        );
        console.log(`📉 Updated stock for product ${item.product}: -${item.qty}`);
      }
    }

    res.status(201).json(createdOrder);
  } catch (error) {
    console.error("❌ Error creating order:", error);
    res.status(500);
    throw new Error("Failed to create order: " + error.message);
  }
});

// @desc Get order by id
// @route GET /api/orders/:id
// @access Private (owner or admin)
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate("user", "name email");
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  // allow if owner or admin
  if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to view this order");
  }
  res.json(order);
});

// @desc Update order to paid
// @route PUT /api/orders/:id/pay
// @access Private
export const updateOrderToPaid = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  order.isPaid = true;
  order.paidAt = Date.now();
  order.paymentResult = {
    id: req.body.id,
    status: req.body.status,
    update_time: req.body.update_time,
    email_address: req.body.email_address
  };
  const updatedOrder = await order.save();
  res.json(updatedOrder);
});

// @desc Get logged in user's orders
// @route GET /api/orders/myorders
// @access Private
export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id });
  res.json(orders);
});

// @desc Get all orders (admin)
// @route GET /api/orders
// @access Private/Admin
export const getOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({}).populate("user", "id name");
  res.json(orders);
});
