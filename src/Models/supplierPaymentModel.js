

import mongoose from "mongoose";

const supplierPaymentSchema = mongoose.Schema(
  {
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "supplier", required: true },
    amount: { type: Number, required: true },
    method: { type: String },
    transactionId: { type: String },
    status: { type: String, default: "pending" },
    notes: { type: String }
  },
  { timestamps: true }
);

const SupplierPayment = mongoose.model("SupplierPayment", supplierPaymentSchema);
export default SupplierPayment;
