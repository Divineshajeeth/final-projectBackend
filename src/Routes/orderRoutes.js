import express from "express";
import {
  addOrder,
  getOrderById,
  updateOrderToPaid,
  getMyOrders,
  getOrders
} from "../Controllers/orderController.js";
import { protect, admin } from "../Middlewares/authMiddleware.js";

const router = express.Router();

router.route("/").post(protect, addOrder).get(protect, admin, getOrders);
router.route("/myorders").get(protect, getMyOrders);
router.route("/:id").get(protect, getOrderById);
router.route("/:id/pay").put(protect, updateOrderToPaid);

export default router;
