import express from "express";
import { addFeedback, getProductFeedback } from "../Controllers/feedbackController.js";
import { protect } from "../Middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", protect, addFeedback);
router.get("/product/:productId", getProductFeedback);

export default router;
