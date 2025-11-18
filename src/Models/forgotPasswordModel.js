// src/Models/forgotPasswordModel.js
import mongoose from "mongoose";

const forgotPasswordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "buyer",
    required: true,
  },
  resetToken: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

const ForgotPassword = mongoose.model("ForgotPassword", forgotPasswordSchema);
export default ForgotPassword;
