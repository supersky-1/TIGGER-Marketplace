import { Router } from "express";
import {
  getSellerBalance,
  requestPayout,
  getMyPayouts,
  getAllPayouts,
  updatePayoutStatus,
} from "../controllers/payoutController";
import { protect, verifiedSellerOnly, adminOnly } from "../middleware/auth";

const router = Router();

// Seller routes
router.get("/balance", protect, verifiedSellerOnly, getSellerBalance);
router.post("/request", protect, verifiedSellerOnly, requestPayout);
router.get("/my-payouts", protect, verifiedSellerOnly, getMyPayouts);

// Admin routes
router.get("/all", protect, adminOnly, getAllPayouts);
router.patch("/:payoutId/status", protect, adminOnly, updatePayoutStatus);

export default router;
