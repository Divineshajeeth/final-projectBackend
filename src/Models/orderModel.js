import mongoose from "mongoose";

const orderItemSchema = mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  size: { type: String },
  qty: { type: Number, required: true },
  price: { type: Number, required: true },
  image: { type: String }, // Store product image path
  productName: { type: String }, // Store product name for fallback display
});

const orderSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderItems: [orderItemSchema],
    shippingAddress: {
      address: String,
      city: String,
      postalCode: String,
      country: String
    },
    paymentMethod: { type: String, default: "card" },
    paymentResult: {
      id: String,
      status: String,
      update_time: String,
      email_address: String
    },
    itemsPrice: { type: Number, required: true },
    shippingPrice: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },
    // Contact information fields
    phoneNumber: { 
      type: String, 
      required: [true, 'Phone number is required'],
      trim: true,
      minlength: [10, 'Phone number must be at least 10 digits'],
      maxlength: [15, 'Phone number cannot exceed 15 digits']
    },
    buyerEmail: { 
      type: String, 
      required: [true, 'Buyer email is required'],
      trim: true
    },
    buyerContact: { 
      type: String, 
      required: [true, 'Buyer contact is required'],
      trim: true,
      minlength: [10, 'Contact number must be at least 10 digits'],
      maxlength: [15, 'Contact number cannot exceed 15 digits']
    },
    buyerName: { 
      type: String, 
      required: [true, 'Buyer name is required'],
      trim: true
    },
    // Order status tracking
    status: { 
      type: String, 
      enum: ["pending", "confirmed", "paid", "shipped", "delivered", "cancelled"], 
      default: "pending" 
    },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    isDelivered: { type: Boolean, default: false },
    deliveredAt: { type: Date }
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
