import asyncHandler from "express-async-handler";
import UserPayment from "../Models/userPaymentModel.js";
import Order from "../Models/orderModel.js";
import { 
  createPaymentIntent, 
  confirmPaymentIntent, 
  processCashPayment as processCashPaymentUtil, 
  getPaymentMethod, 
  verifyWebhookSignature,
  createCustomer,
  getCustomerPaymentMethods,
  attachPaymentMethodToCustomer,
  createPaymentIntentWithCustomer,
  createCheckoutSession
} from "../Utils/paymentGatway.js";

// Process cash payment (for cash on delivery)
export const processCashPayment = asyncHandler(async (req, res) => {
  console.log("💵 Processing cash payment request:", JSON.stringify(req.body, null, 2));
  
  const { 
    orderId, 
    amount, 
    currency = "lkr",
    description 
  } = req.body;

  // Validate required fields
  if (!orderId || !amount) {
    res.status(400);
    throw new Error("Order ID and amount are required");
  }

  // Get order details
  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Verify user authorization
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to process payment for this order");
  }

  // Verify amount matches order total
  if (Math.abs(amount - order.totalPrice) > 0.01) {
    res.status(400);
    throw new Error(`Amount mismatch. Order total: Rs.${order.totalPrice}, Payment amount: Rs.${amount}`);
  }

  try {
    // Process cash payment
    const paymentResult = await processCashPaymentUtil({
      amount,
      currency,
      description: description || `Cash payment for order ${orderId}`
    });

    // Update order for cash payment
    order.paymentMethod = "cash";
    order.paymentStatus = "pending";
    order.paymentResult = {
      transactionId: paymentResult.transactionId,
      gateway: "cash",
      amount: paymentResult.amount,
      currency: paymentResult.currency,
      status: "pending"
    };
    order.paymentTimestamps = {
      initiated: new Date(),
      completed: new Date()
    };
    order.status = "confirmed"; // Cash orders are confirmed but pending payment

    await order.save();

    // Create payment record
    const payment = await UserPayment.create({
      user: order.user,
      order: orderId,
      amount,
      method: "cash",
      transactionId: paymentResult.transactionId,
      status: "pending",
      gateway: "cash",
      currency,
      gatewayResponse: {
        id: paymentResult.transactionId,
        status: paymentResult.status,
        transactionId: paymentResult.transactionId
      },
      processedAt: new Date(paymentResult.processedAt)
    });

    console.log("✅ Cash payment processed successfully:", {
      paymentId: payment._id,
      orderId,
      transactionId: paymentResult.transactionId
    });

    res.status(201).json({
      success: true,
      payment,
      order,
      message: "Cash payment processed successfully"
    });

  } catch (error) {
    console.error("❌ Cash payment processing error:", error);
    
    // Update order status to failed
    if (order) {
      order.paymentStatus = "failed";
      order.paymentTimestamps = {
        initiated: new Date(),
        failed: new Date()
      };
      await order.save();
    }

    res.status(500);
    throw new Error(`Cash payment processing failed: ${error.message}`);
  }
});

// Create Stripe Payment Intent
export const createStripePaymentIntent = asyncHandler(async (req, res) => {
  console.log("💳 Creating Stripe Payment Intent:", JSON.stringify(req.body, null, 2));
  console.log("🔑 Stripe keys check:", {
    hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
    secretKeyPrefix: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 10) + '...' : 'none'
  });
  
  const { orderId, amount, currency = "lkr", description } = req.body;

  // Validate required fields
  if (!orderId || !amount) {
    console.log("❌ Validation failed - Missing required fields:", { orderId, amount });
    res.status(400);
    throw new Error("Order ID and amount are required");
  }

  // Validate amount is a positive number
  if (typeof amount !== 'number' || amount <= 0) {
    console.log("❌ Validation failed - Invalid amount:", amount);
    res.status(400);
    throw new Error("Amount must be a positive number");
  }

  // Get order details
  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Verify user authorization
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to create payment intent for this order");
  }

  // Verify amount matches order total
  if (Math.abs(amount - order.totalPrice) > 0.01) {
    res.status(400);
    throw new Error(`Amount mismatch. Order total: Rs.${order.totalPrice}, Payment amount: Rs.${amount}`);
  }

  try {
    // Create payment intent with Stripe
    const paymentIntentResult = await createPaymentIntent({
      amount,
      currency,
      description: description || `Payment for order ${orderId}`,
      metadata: {
        orderId: orderId.toString(),
        userId: req.user._id.toString()
      }
    });

    if (!paymentIntentResult.success) {
      res.status(400);
      throw new Error(`Failed to create payment intent: ${paymentIntentResult.error}`);
    }

    // Update order with payment intent ID
    order.paymentResult = {
      id: paymentIntentResult.id,
      status: paymentIntentResult.status,
      gateway: "stripe",
      amount: paymentIntentResult.amount,
      currency: paymentIntentResult.currency
    };
    order.paymentTimestamps = {
      initiated: new Date()
    };
    await order.save();

    console.log("✅ Payment Intent created successfully:", {
      paymentIntentId: paymentIntentResult.id,
      orderId,
      amount: paymentIntentResult.amount
    });

    res.json({
      success: true,
      clientSecret: paymentIntentResult.clientSecret,
      paymentIntentId: paymentIntentResult.id,
      amount: paymentIntentResult.amount,
      currency: paymentIntentResult.currency
    });

  } catch (error) {
    console.error("❌ Payment Intent creation error:", error);
    res.status(500);
    throw new Error(`Payment Intent creation failed: ${error.message}`);
  }
});

// Confirm Stripe Payment
export const confirmStripePayment = asyncHandler(async (req, res) => {
  console.log("💳 Confirming Stripe Payment:", JSON.stringify(req.body, null, 2));
  console.log("👤 Authenticated user:", { 
    userId: req.user._id, 
    userEmail: req.user.email, 
    userRole: req.user.role 
  });
  
  const { paymentIntentId, orderId } = req.body;

  // Validate required fields
  if (!paymentIntentId || !orderId) {
    console.log("❌ Validation failed - Missing required fields:", { paymentIntentId, orderId });
    return res.status(400).json({
      success: false,
      message: "Payment Intent ID and Order ID are required",
      received: { paymentIntentId, orderId }
    });
  }

  // Validate ObjectId format
  if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
    console.log("❌ Validation failed - Invalid Order ID format:", orderId);
    return res.status(400).json({
      success: false,
      message: "Invalid Order ID format"
    });
  }

  try {
    // Get order details with user population
    const order = await Order.findById(orderId).populate("user", "name email");
    if (!order) {
      console.log("❌ Validation failed - Order not found:", orderId);
      return res.status(404).json({
        success: false,
        message: "Order not found",
        orderId: orderId
      });
    }

    console.log("📦 Order details:", {
      orderId: order._id,
      orderUser: order.user?._id,
      orderUserEmail: order.user?.email,
      orderStatus: order.status,
      orderTotalPrice: order.totalPrice
    });

    // Verify user authorization - handle case where order.user might be a string
    const orderUserId = order.user?._id?.toString() || order.user?.toString();
    if (!orderUserId || (orderUserId !== req.user._id.toString() && req.user.role !== "admin")) {
      console.log("❌ Authorization failed:", {
        orderUser: orderUserId,
        requestUser: req.user._id,
        userRole: req.user.role
      });
      return res.status(403).json({
        success: false,
        message: "Not authorized to confirm payment for this order"
      });
    }

    console.log("✅ Authorization passed");

    // Retrieve payment intent details from Stripe (not confirm, since client already confirmed)
    const paymentResult = await confirmPaymentIntent(paymentIntentId);

    if (!paymentResult.success) {
      return res.status(400).json({
        success: false,
        message: paymentResult.error || `Failed to retrieve payment: ${paymentResult.error}`
      });
    }

    const paymentIntent = paymentResult.paymentIntent;

    // Check if payment intent is too old (older than 1 hour)
    const createdTime = new Date(paymentIntent.created * 1000);
    const currentTime = new Date();
    const hoursDiff = (currentTime - createdTime) / (1000 * 60 * 60);
    
    if (hoursDiff > 1) {
      return res.status(400).json({
        success: false,
        message: "Payment session has expired. Please try again."
      });
    }

    // Check if payment is already processed for this order
    const existingPayment = await UserPayment.findOne({ 
      order: orderId, 
      transactionId: paymentIntentId 
    });
    
    if (existingPayment && existingPayment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: "Payment has already been processed for this order."
      });
    }
    let paymentStatus = "pending";

    // Update order based on payment status
    if (paymentIntent.status === "succeeded") {
      paymentStatus = "completed";
      order.isPaid = true;
      order.paidAt = new Date();
      order.status = "paid";
    } else if (paymentIntent.status === "requires_payment_method") {
      paymentStatus = "pending";
    } else if (paymentIntent.status === "canceled") {
      paymentStatus = "failed";
    } else if (paymentIntent.status === "processing") {
      paymentStatus = "processing";
    }

    // Get payment method details if available
    let cardDetails = null;
    if (paymentIntent.payment_method) {
      const paymentMethodResult = await getPaymentMethod(paymentIntent.payment_method);
      if (paymentMethodResult.success && paymentMethodResult.paymentMethod.card) {
        const card = paymentMethodResult.paymentMethod.card;
        cardDetails = {
          last4: card.last4,
          brand: card.brand,
          expiry: `${card.expiry_month.toString().padStart(2, '0')}/${card.expiry_year.toString().slice(-2)}`
        };
      }
    }

    // Update order with payment details
    order.paymentMethod = "card";
    order.paymentStatus = paymentStatus;
    order.paymentResult = {
      id: paymentIntent.id,
      status: paymentIntent.status,
      transactionId: paymentIntent.id,
      gateway: "stripe",
      amount: paymentResult.amount,
      currency: paymentResult.currency
    };
    order.cardDetails = cardDetails;
    order.paymentTimestamps = {
      ...order.paymentTimestamps,
      completed: paymentStatus === "completed" ? new Date() : undefined
    };

    await order.save();

    // Create payment record
    const payment = await UserPayment.create({
      user: order.user,
      order: orderId,
      amount: paymentResult.amount,
      method: "stripe",
      transactionId: paymentIntent.id,
      status: paymentStatus,
      gateway: "stripe",
      currency: paymentResult.currency,
      cardDetails,
      gatewayResponse: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      },
      processedAt: paymentStatus === "completed" ? new Date() : undefined
    });

    console.log("✅ Payment confirmed successfully:", {
      paymentId: payment._id,
      orderId,
      status: paymentStatus,
      paymentIntentId
    });

    res.json({
      success: true,
      payment,
      order,
      paymentStatus,
      message: paymentStatus === "completed" 
        ? "Payment confirmed successfully" 
        : `Payment status: ${paymentStatus}`
    });

  } catch (error) {
    console.error("❌ Payment confirmation error:", error);
    
    // Try to get order for error handling
    try {
      const order = await Order.findById(orderId);
      if (order) {
        order.paymentStatus = "failed";
        order.paymentTimestamps = {
          ...order.paymentTimestamps,
          failed: new Date()
        };
        await order.save();
      }
    } catch (orderError) {
      console.error("❌ Failed to update order status:", orderError);
    }

    return res.status(500).json({
      success: false,
      message: `Payment confirmation failed: ${error.message}`
    });
  }
});

// Stripe Webhook Handler
export const stripeWebhook = asyncHandler(async (req, res) => {
  console.log("🪝 Processing Stripe webhook");
  
  try {
    const event = verifyWebhookSignature(req);
    
    if (!event) {
      console.error("❌ Webhook signature verification failed");
      return res.status(400).json({ error: "Webhook signature verification failed" });
    }

    console.log(`📦 Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object);
        break;
      
      case 'payment_intent.requires_action':
        await handlePaymentRequiresAction(event.data.object);
        break;
      
      default:
        console.log(`🔍 Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// Webhook event handlers
async function handlePaymentSucceeded(paymentIntent) {
  console.log("✅ Payment succeeded:", paymentIntent.id);
  
  try {
    const orderId = paymentIntent.metadata.orderId;
    if (!orderId) return;

    const order = await Order.findById(orderId);
    if (!order) return;

    // Update order status
    order.paymentStatus = "completed";
    order.paymentMethod = "card";
    order.isPaid = true;
    order.paidAt = new Date();
    order.status = "paid";
    order.paymentResult = {
      id: paymentIntent.id,
      status: paymentIntent.status,
      transactionId: paymentIntent.id,
      gateway: "stripe",
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency
    };
    order.paymentTimestamps = {
      ...order.paymentTimestamps,
      completed: new Date()
    };

    await order.save();

    // Update or create payment record
    await UserPayment.findOneAndUpdate(
      { transactionId: paymentIntent.id },
      {
        status: "completed",
        gatewayResponse: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency
        },
        processedAt: new Date()
      },
      { upsert: true }
    );

    console.log("✅ Order updated for successful payment:", orderId);
  } catch (error) {
    console.error("❌ Error handling payment succeeded:", error);
  }
}

async function handlePaymentFailed(paymentIntent) {
  console.log("❌ Payment failed:", paymentIntent.id);
  
  try {
    const orderId = paymentIntent.metadata.orderId;
    if (!orderId) return;

    const order = await Order.findById(orderId);
    if (!order) return;

    // Update order status
    order.paymentStatus = "failed";
    order.paymentTimestamps = {
      ...order.paymentTimestamps,
      failed: new Date()
    };

    await order.save();

    // Update payment record
    await UserPayment.findOneAndUpdate(
      { transactionId: paymentIntent.id },
      {
        status: "failed",
        failureReason: paymentIntent.last_payment_error?.message || "Payment failed",
        gatewayResponse: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          last_payment_error: paymentIntent.last_payment_error
        }
      },
      { upsert: true }
    );

    console.log("❌ Order updated for failed payment:", orderId);
  } catch (error) {
    console.error("❌ Error handling payment failed:", error);
  }
}

async function handlePaymentCanceled(paymentIntent) {
  console.log("🚫 Payment canceled:", paymentIntent.id);
  
  try {
    const orderId = paymentIntent.metadata.orderId;
    if (!orderId) return;

    const order = await Order.findById(orderId);
    if (!order) return;

    // Update order status
    order.paymentStatus = "canceled";
    order.paymentTimestamps = {
      ...order.paymentTimestamps,
      canceled: new Date()
    };

    await order.save();

    // Update payment record
    await UserPayment.findOneAndUpdate(
      { transactionId: paymentIntent.id },
      {
        status: "canceled",
        gatewayResponse: {
          id: paymentIntent.id,
          status: paymentIntent.status
        }
      },
      { upsert: true }
    );

    console.log("🚫 Order updated for canceled payment:", orderId);
  } catch (error) {
    console.error("❌ Error handling payment canceled:", error);
  }
}

async function handlePaymentRequiresAction(paymentIntent) {
  console.log("⏳ Payment requires action:", paymentIntent.id);
  
  try {
    const orderId = paymentIntent.metadata.orderId;
    if (!orderId) return;

    const order = await Order.findById(orderId);
    if (!order) return;

    // Update order status
    order.paymentStatus = "requires_action";

    await order.save();

    // Update payment record
    await UserPayment.findOneAndUpdate(
      { transactionId: paymentIntent.id },
      {
        status: "requires_action",
        gatewayResponse: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          next_action: paymentIntent.next_action
        }
      },
      { upsert: true }
    );

    console.log("⏳ Order updated for payment requiring action:", orderId);
  } catch (error) {
    console.error("❌ Error handling payment requires action:", error);
  }
}

// Create User Payment (legacy endpoint)
export const createUserPayment = asyncHandler(async (req, res) => {
  console.log("💳 Creating user payment record (legacy):", JSON.stringify(req.body, null, 2));
  
  const { 
    orderId, 
    amount, 
    method = "cash",
    transactionId,
    status = "pending",
    gateway = "manual",
    currency = "lkr"
  } = req.body;

  // Validate required fields
  if (!orderId || !amount) {
    res.status(400);
    throw new Error("Order ID and amount are required");
  }

  // Get order details
  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Verify user authorization
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to create payment for this order");
  }

  // Create payment record
  const payment = await UserPayment.create({
    user: order.user,
    order: orderId,
    amount,
    method,
    transactionId: transactionId || `manual_${Date.now()}`,
    status,
    gateway,
    currency,
    processedAt: status === "completed" ? new Date() : undefined
  });

  // Update order with payment info
  order.paymentMethod = method;
  order.paymentStatus = status;
  order.paymentResult = {
    transactionId: payment.transactionId,
    gateway: gateway,
    amount: amount,
    currency: currency,
    status: status
  };
  order.paymentTimestamps = {
    initiated: new Date(),
    completed: status === "completed" ? new Date() : undefined
  };

  if (status === "completed") {
    order.isPaid = true;
    order.paidAt = new Date();
    order.status = "paid";
  }

  await order.save();

  console.log("✅ User payment record created:", {
    paymentId: payment._id,
    orderId,
    method,
    status
  });

  res.status(201).json({
    success: true,
    payment,
    order,
    message: "Payment record created successfully"
  });
});

// Get payment details for a specific order
export const getOrderPayment = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  // Validate ObjectId format
  if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
    res.status(400);
    throw new Error("Invalid Order ID format");
  }

  // Get order details
  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Verify user authorization
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to view payment for this order");
  }

  // Get payment details
  const payment = await UserPayment.findOne({ order: orderId })
    .populate("user", "name email")
    .populate("order", "orderItems totalPrice shippingPrice taxPrice status");

  if (!payment) {
    res.status(404);
    throw new Error("Payment record not found for this order");
  }

  res.json({
    success: true,
    payment,
    order
  });
});

// Get all payments for a user
export const getUserPayments = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  // If userId is provided in params, verify authorization
  if (userId) {
    // Validate ObjectId format
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400);
      throw new Error("Invalid User ID format");
    }

    // Verify user authorization (admin can view any user's payments, users can only view their own)
    if (userId !== req.user._id.toString() && req.user.role !== "admin") {
      res.status(403);
      throw new Error("Not authorized to view payments for this user");
    }
  }

  // Get payments for the user (either from params or current user)
  const targetUserId = userId || req.user._id;
  
  const payments = await UserPayment.find({ user: targetUserId })
    .populate("user", "name email")
    .populate("order", "orderItems totalPrice shippingPrice taxPrice status createdAt")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    payments,
    count: payments.length
  });
});

// Get all payments (admin only)
export const getAllPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, method } = req.query;
  
  // Build query
  const query = {};
  if (status) query.status = status;
  if (method) query.method = method;

  // Get payments with pagination
  const payments = await UserPayment.find(query)
    .populate("user", "name email")
    .populate("order", "orderItems totalPrice shippingPrice taxPrice status createdAt")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  // Get total count
  const total = await UserPayment.countDocuments(query);

  res.json({
    success: true,
    payments,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// Update payment status (admin only)
export const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;
  const { status, failureReason } = req.body;

  // Validate ObjectId format
  if (!paymentId.match(/^[0-9a-fA-F]{24}$/)) {
    res.status(400);
    throw new Error("Invalid Payment ID format");
  }

  // Validate status
  const validStatuses = ["pending", "completed", "failed", "canceled", "requires_action"];
  if (!validStatuses.includes(status)) {
    res.status(400);
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  // Get payment details
  const payment = await UserPayment.findById(paymentId).populate("order");
  if (!payment) {
    res.status(404);
    throw new Error("Payment not found");
  }

  // Update payment status
  payment.status = status;
  if (failureReason) payment.failureReason = failureReason;
  
  if (status === "completed") {
    payment.processedAt = new Date();
  }

  await payment.save();

  // Update corresponding order if payment is completed
  if (payment.order && status === "completed") {
    const order = payment.order;
    order.paymentStatus = "completed";
    order.isPaid = true;
    order.paidAt = new Date();
    order.status = "paid";
    order.paymentTimestamps = {
      ...order.paymentTimestamps,
      completed: new Date()
    };
    await order.save();
  }

  console.log("✅ Payment status updated:", {
    paymentId,
    oldStatus: payment.status,
    newStatus: status
  });

  res.json({
    success: true,
    payment,
    message: `Payment status updated to ${status}`
  });
});

// Create Stripe Customer
export const createStripeCustomer = asyncHandler(async (req, res) => {
  console.log("👤 Creating Stripe customer:", JSON.stringify(req.body, null, 2));
  
  const { email, name } = req.body;

  // Validate required fields
  if (!email || !name) {
    res.status(400);
    throw new Error("Email and name are required");
  }

  try {
    const customerResult = await createCustomer({
      email,
      name,
      metadata: {
        userId: req.user._id.toString()
      }
    });

    if (!customerResult.success) {
      res.status(400);
      throw new Error(`Failed to create customer: ${customerResult.error}`);
    }

    console.log("✅ Stripe customer created:", customerResult.customer.id);

    res.json({
      success: true,
      customer: customerResult.customer,
      message: "Stripe customer created successfully"
    });

  } catch (error) {
    console.error("❌ Customer creation error:", error);
    res.status(500);
    throw new Error(`Customer creation failed: ${error.message}`);
  }
});

// Get saved payment methods for customer
export const getSavedPaymentMethods = asyncHandler(async (req, res) => {
  console.log("💳 Getting saved payment methods for user:", req.user._id);
  
  try {
    // Get user's Stripe customer ID from user model or create one
    let customerId = req.user.stripeCustomerId;
    
    if (!customerId) {
      // Create a Stripe customer for the user
      const customerResult = await createCustomer({
        email: req.user.email,
        name: req.user.name,
        metadata: {
          userId: req.user._id.toString()
        }
      });

      if (!customerResult.success) {
        res.status(400);
        throw new Error(`Failed to create customer: ${customerResult.error}`);
      }

      customerId = customerResult.customer.id;
      
      // Update user with Stripe customer ID
      req.user.stripeCustomerId = customerId;
      await req.user.save();
    }

    const paymentMethodsResult = await getCustomerPaymentMethods(customerId);

    if (!paymentMethodsResult.success) {
      res.status(400);
      throw new Error(`Failed to get payment methods: ${paymentMethodsResult.error}`);
    }

    console.log("✅ Retrieved payment methods:", paymentMethodsResult.paymentMethods.length);

    res.json({
      success: true,
      paymentMethods: paymentMethodsResult.paymentMethods,
      customerId
    });

  } catch (error) {
    console.error("❌ Payment methods retrieval error:", error);
    res.status(500);
    throw new Error(`Payment methods retrieval failed: ${error.message}`);
  }
});

// Save payment method to customer
export const savePaymentMethod = asyncHandler(async (req, res) => {
  console.log("💾 Saving payment method:", JSON.stringify(req.body, null, 2));
  
  const { paymentMethodId } = req.body;

  if (!paymentMethodId) {
    res.status(400);
    throw new Error("Payment Method ID is required");
  }

  try {
    // Get user's Stripe customer ID
    let customerId = req.user.stripeCustomerId;
    
    if (!customerId) {
      // Create a Stripe customer for the user
      const customerResult = await createCustomer({
        email: req.user.email,
        name: req.user.name,
        metadata: {
          userId: req.user._id.toString()
        }
      });

      if (!customerResult.success) {
        res.status(400);
        throw new Error(`Failed to create customer: ${customerResult.error}`);
      }

      customerId = customerResult.customer.id;
      
      // Update user with Stripe customer ID
      req.user.stripeCustomerId = customerId;
      await req.user.save();
    }

    const attachResult = await attachPaymentMethodToCustomer(paymentMethodId, customerId);

    if (!attachResult.success) {
      res.status(400);
      throw new Error(`Failed to save payment method: ${attachResult.error}`);
    }

    console.log("✅ Payment method saved:", attachResult.paymentMethod.id);

    res.json({
      success: true,
      paymentMethod: attachResult.paymentMethod,
      message: "Payment method saved successfully"
    });

  } catch (error) {
    console.error("❌ Payment method save error:", error);
    res.status(500);
    throw new Error(`Payment method save failed: ${error.message}`);
  }
});

// Remove saved payment method
export const removePaymentMethod = asyncHandler(async (req, res) => {
  const { paymentMethodId } = req.params;

  if (!paymentMethodId) {
    res.status(400);
    throw new Error("Payment Method ID is required");
  }

  try {
    const stripe = getStripeInstance();
    
    // Detach payment method from customer
    await stripe.paymentMethods.detach(paymentMethodId);

    console.log("✅ Payment method removed:", paymentMethodId);

    res.json({
      success: true,
      message: "Payment method removed successfully"
    });

  } catch (error) {
    console.error("❌ Payment method removal error:", error);
    res.status(500);
    throw new Error(`Payment method removal failed: ${error.message}`);
  }
});

// Create Stripe Checkout Session
export const createStripeCheckoutSession = asyncHandler(async (req, res) => {
  console.log("🛒 Creating Stripe Checkout Session:", JSON.stringify(req.body, null, 2));
  
  const { orderId, amount, currency = "lkr", successUrl, cancelUrl } = req.body;

  // Validate required fields
  if (!orderId || !amount) {
    res.status(400);
    throw new Error("Order ID and amount are required");
  }

  // Get order details
  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Verify user authorization
  if (order.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to create checkout session for this order");
  }

  // Verify amount matches order total
  if (Math.abs(amount - order.totalPrice) > 0.01) {
    res.status(400);
    throw new Error(`Amount mismatch. Order total: Rs.${order.totalPrice}, Payment amount: Rs.${amount}`);
  }

  try {
    // Get user's Stripe customer ID if available
    let customerId = req.user.stripeCustomerId;

    const sessionResult = await createCheckoutSession({
      amount,
      currency,
      customerId,
      successUrl,
      cancelUrl,
      metadata: {
        orderId: orderId.toString(),
        userId: req.user._id.toString()
      }
    });

    if (!sessionResult.success) {
      res.status(400);
      throw new Error(`Failed to create checkout session: ${sessionResult.error}`);
    }

    // Update order with session info
    order.paymentResult = {
      sessionId: sessionResult.sessionId,
      status: "pending",
      gateway: "stripe_checkout",
      amount: amount,
      currency: currency
    };
    order.paymentTimestamps = {
      initiated: new Date()
    };
    await order.save();

    console.log("✅ Checkout session created:", sessionResult.sessionId);

    res.json({
      success: true,
      sessionId: sessionResult.sessionId,
      url: sessionResult.url,
      message: "Checkout session created successfully"
    });

  } catch (error) {
    console.error("❌ Checkout session creation error:", error);
    res.status(500);
    throw new Error(`Checkout session creation failed: ${error.message}`);
  }
});
