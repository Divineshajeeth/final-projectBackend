import express from "express";
import {
  addOrder,
  getOrderById,
  updateOrderToPaid,
  getMyOrders,
  getOrdersByUser,
  getOrders,
  updateOrderStatus,
  deleteOrder
} from "../Controllers/orderController.js";
import { protect, admin } from "../Middlewares/authMiddleware.js";

const router = express.Router();

router.route("/").post(protect, addOrder).get(protect, admin, getOrders);
router.route("/myorders").get(protect, getMyOrders);
router.route("/user/:userId").get(protect, getOrdersByUser);
router.route("/:id").get(protect, getOrderById).delete(protect, deleteOrder);
router.route("/:id/pay").put(protect, updateOrderToPaid);
router.route("/:id/status").put(protect, updateOrderStatus);

export default router;
