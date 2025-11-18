
import asyncHandler from "express-async-handler";
import UserPayment from "../Models/userPaymentModel.js";

// create payment record (mock)
export const createUserPayment = asyncHandler(async (req, res) => {
  const { userId, orderId, amount, method, transactionId, status } = req.body;
  const payment = await UserPayment.create({
    user: userId,
    order: orderId,
    amount,
    method,
    transactionId,
    status: status || "completed"
  });
  res.status(201).json(payment);
});

// get payments for a user
export const getUserPayments = asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.user._id;
  const payments = await UserPayment.find({ user: userId }).populate("order");
  res.json(payments);
});
