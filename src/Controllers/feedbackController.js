import asyncHandler from "express-async-handler";
import Feedback from "../Models/feedbackModel.js";

// add feedback
export const addFeedback = asyncHandler(async (req, res) => {
  const { product, rating, comment } = req.body;
  const feedback = await Feedback.create({
    user: req.user._id,
    product,
    rating,
    comment
  });
  res.status(201).json(feedback);
});

// get feedback for product
export const getProductFeedback = asyncHandler(async (req, res) => {
  const productId = req.params.productId;
  const feedbacks = await Feedback.find({ product: productId }).populate("user", "name");
  res.json(feedbacks);
});
