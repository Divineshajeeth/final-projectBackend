
import asyncHandler from "express-async-handler";
import UserPayment from "../Models/userPaymentModel.js";
import Order from "../Models/orderModel.js";
import { processCardPayment, processCashPayment } from "../Utils/paymentGatway.js";

// Process payment with card
export const processPayment = asyncHandler(async (req, res) => {
  console.log("💳 Processing payment request:", JSON.stringify(req.body, null, 2));
  
  const { 
    orderId, 
    paymentMethod, 
    cardDetails, 
    amount, 
    currency = "inr",
    description 
  } = req.body;

  // Validate required fields
  if (!orderId || !paymentMethod || !amount) {
    res.status(400);
    throw new Error("Order ID, payment method, and amount are required");
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
    throw new Error(`Amount mismatch. Order total: ₹${order.totalPrice}, Payment amount: ₹${amount}`);
  }

  let paymentResult;
  let paymentStatus = "pending";

  try {
    if (paymentMethod === "card") {
      if (!cardDetails) {
        res.status(400);
        throw new Error("Card details are required for card payment");
      }

      // Process card payment
      paymentResult = await processCardPayment({
        cardDetails,
        amount,
        currency,
        description: description || `Payment for order ${orderId}`
      });

      if (paymentResult.success) {
        paymentStatus = "completed";
        
        // Update order with payment details
        order.paymentMethod = "card";
        order.paymentStatus = "completed";
        order.paymentResult = {
          id: paymentResult.paymentIntentId,
          status: paymentResult.status,
          transactionId: paymentResult.transactionId,
          gateway: "mock",
          amount: paymentResult.amount,
          currency: paymentResult.currency
        };
        order.cardDetails = {
          last4: paymentResult.cardDetails.last4,
          brand: paymentResult.cardDetails.brand,
          expiry: paymentResult.cardDetails.expiry,
          cardholderName: paymentResult.cardDetails.cardholderName
        };
        order.paymentTimestamps = {
          initiated: new Date(),
          completed: new Date()
        };
        order.isPaid = true;
        order.paidAt = new Date();
        order.status = "paid";

        await order.save();
      } else {
        paymentStatus = "failed";
        order.paymentStatus = "failed";
        order.paymentTimestamps = {
          initiated: new Date(),
          failed: new Date()
        };
        await order.save();
      }
    } else if (paymentMethod === "cash") {
      // Process cash payment
      paymentResult = await processCashPayment({
        amount,
        currency,
        description: description || `Cash payment for order ${orderId}`
      });

      paymentStatus = "completed"; // Cash payments are considered confirmed when order is placed
      
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
    }

    // Create payment record
    const payment = await UserPayment.create({
      user: order.user,
      order: orderId,
      amount,
      method: paymentMethod,
      transactionId: paymentResult.transactionId,
      status: paymentStatus,
      gateway: paymentResult.gateway || "mock",
      currency,
      cardDetails: paymentResult.cardDetails || undefined,
      gatewayResponse: paymentResult.success ? {
        id: paymentResult.paymentIntentId,
        status: paymentResult.status,
        transactionId: paymentResult.transactionId
      } : {
        failure_code: paymentResult.code,
        failure_message: paymentResult.error
      },
      failureReason: paymentResult.success ? undefined : paymentResult.error,
      processedAt: paymentResult.success ? new Date(paymentResult.processedAt) : undefined
    });

    console.log("✅ Payment processed successfully:", {
      paymentId: payment._id,
      orderId,
      status: paymentStatus,
      transactionId: paymentResult.transactionId
    });

    res.status(201).json({
      success: paymentResult.success,
      payment,
      order,
      message: paymentResult.success 
        ? "Payment processed successfully" 
        : `Payment failed: ${paymentResult.error}`
    });

  } catch (error) {
    console.error("❌ Payment processing error:", error);
    
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
    throw new Error(`Payment processing failed: ${error.message}`);
  }
});

// Get payment details for an order
export const getOrderPayment = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  
  const payment = await UserPayment.findOne({ order: orderId })
    .populate("order")
    .populate("user", "name email");

  if (!payment) {
    res.status(404);
    throw new Error("Payment not found for this order");
  }

  // Check authorization
  if (payment.user._id.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to view this payment");
  }

  res.json(payment);
});

// Get all payments for a user
export const getUserPayments = asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.user._id;
  
  // Authorization check
  if (userId !== req.user._id.toString() && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to view payments for this user");
  }

  const payments = await UserPayment.find({ user: userId })
    .populate("order")
    .sort({ createdAt: -1 });

  res.json(payments);
});

// Get all payments (admin only)
export const getAllPayments = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Admin access required");
  }

  const payments = await UserPayment.find({})
    .populate("order")
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  res.json(payments);
});

// Update payment status (admin only)
export const updatePaymentStatus = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403);
    throw new Error("Admin access required");
  }

  const { paymentId } = req.params;
  const { status, notes } = req.body;

  const payment = await UserPayment.findById(paymentId);
  if (!payment) {
    res.status(404);
    throw new Error("Payment not found");
  }

  const validStatuses = ["pending", "processing", "completed", "failed", "refunded"];
  if (!validStatuses.includes(status)) {
    res.status(400);
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  payment.status = status;
  
  if (status === "completed") {
    payment.processedAt = new Date();
  } else if (status === "refunded") {
    payment.refundedAt = new Date();
  }

  await payment.save();

  // Update corresponding order
  const order = await Order.findById(payment.order);
  if (order) {
    order.paymentStatus = status;
    if (status === "completed") {
      order.isPaid = true;
      order.paidAt = new Date();
      order.status = "paid";
    }
    await order.save();
  }

  res.json({
    message: "Payment status updated successfully",
    payment
  });
});

// Legacy function for backward compatibility
export const createUserPayment = processPayment;
