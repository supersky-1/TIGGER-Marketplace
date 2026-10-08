import { Router } from "express";
import {
  submitVerification,
  getPendingVerifications,
  updateVerificationStatus,
} from "../controllers/verificationController";
import { protect, sellerOnly, adminOnly } from "../middleware/auth";
import upload from "../middleware/upload";

const router = Router();

// Seller submits documents
router.post(
  "/submit",
  protect,
  sellerOnly,
  upload.array("documents", 5),
  submitVerification
);

// Admin routes
router.get("/pending", protect, adminOnly, getPendingVerifications);
router.patch("/:userId", protect, adminOnly, updateVerificationStatus);

export default router;
