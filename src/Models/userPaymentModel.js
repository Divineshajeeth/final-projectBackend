

import mongoose from "mongoose";

const userPaymentSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    amount: { type: Number, required: true },
    method: { 
      type: String, 
      enum: ["stripe", "cash"],
      required: true 
    },
    transactionId: { type: String, unique: true, sparse: true },
    status: { 
      type: String, 
      enum: ["pending", "processing", "completed", "failed", "refunded"], 
      default: "pending" 
    },
    gateway: { type: String, default: "mock" },
    currency: { type: String, default: "inr" },
    cardDetails: {
      last4: String,
      brand: String,
      expiry: String,
    },
    gatewayResponse: {
      id: String,
      status: String,
      update_time: String,
      email_address: String,
      failure_code: String,
      failure_message: String
    },
    failureReason: String,
    processedAt: Date,
    refundedAt: Date
  },
  { timestamps: true }
);

const UserPayment = mongoose.model("UserPayment", userPaymentSchema);
export default UserPayment;
