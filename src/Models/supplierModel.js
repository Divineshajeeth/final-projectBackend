import mongoose from "mongoose";

const supplierSchema = mongoose.Schema(
  {
    name: { type: String, required: true },

    bottleNo: { type: Number, required: true },      // Supplier bottle no
    contactNo: { type: String, required: true },     // Supplier contact number
    bottlePrice: { type: Number, default: 1 },       // 1 bottle = ₹1

    role: { type: String, default: "supplier" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

const Supplier = mongoose.model("Supplier", supplierSchema);
export default Supplier;
