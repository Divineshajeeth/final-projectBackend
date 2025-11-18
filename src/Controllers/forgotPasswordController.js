import crypto from "crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import User from "../Models/userModel.js";
import ForgotPassword from "../Models/forgotPasswordModel.js";

// 1️⃣ Step — Send OTP to Email
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP before saving (for security)
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    // Save OTP in DB (delete old one if exists)
    await ForgotPassword.deleteMany({ userId: user._id });
    await ForgotPassword.create({
      userId: user._id,
      resetToken: otpHash,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 mins
    });

    // Setup Nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Send OTP Email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP for password reset is: ${otp}. It will expire in 10 minutes.`,
    });

    res.status(200).json({ message: "OTP sent to your email successfully!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2️⃣ Step — Verify OTP and Reset Password
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    const resetRecord = await ForgotPassword.findOne({
      userId: user._id,
      resetToken: otpHash,
      expiresAt: { $gt: Date.now() },
    });

    if (!resetRecord) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await ForgotPassword.deleteOne({ _id: resetRecord._id });

    res.json({ message: "Password reset successful!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
  

