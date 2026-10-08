import { Router } from "express";
import {
  createOrder,
  getSellerOrders,
  getMyOrders,
  updateOrderStatus,
} from "../controllers/orderController";
import { protect, verifiedSellerOnly } from "../middleware/auth";

const router = Router();

router.post("/", protect, createOrder);
router.get("/my-orders", protect, getMyOrders);
router.get("/seller-orders", protect, verifiedSellerOnly, getSellerOrders);
router.patch("/:orderId/status", protect, verifiedSellerOnly, updateOrderStatus);

export default router;
