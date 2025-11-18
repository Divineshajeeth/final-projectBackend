

import mongoose from "mongoose";

const feedbackSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "buyer", required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String }
  },
  { timestamps: true }
);

const Feedback = mongoose.model("Feedback", feedbackSchema);
export default Feedback;
