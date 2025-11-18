import asyncHandler from "express-async-handler";
import SupplierPayment from "../Models/supplierPaymentModel.js";

// create supplier payment
export const createSupplierPayment = asyncHandler(async (req, res) => {
  const { supplierId, amount, method, transactionId, notes } = req.body;
  const payment = await SupplierPayment.create({
    supplier: supplierId,
    amount,
    method,
    transactionId,
    notes,
    status: "completed"
  });
  res.status(201).json(payment);
});

// get all supplier payments (admin)
export const getSupplierPayments = asyncHandler(async (req, res) => {
  const payments = await SupplierPayment.find({}).populate("supplier");
  res.json(payments);
});
