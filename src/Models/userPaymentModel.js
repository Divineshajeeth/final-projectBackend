

import mongoose from "mongoose";

const userPaymentSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    amount: { type: Number, required: true },
    method: { type: String, default: "card" },
    transactionId: { type: String },
    status: { type: String, default: "pending" }
  },
  { timestamps: true }
);

const UserPayment = mongoose.model("UserPayment", userPaymentSchema);
export default UserPayment;
