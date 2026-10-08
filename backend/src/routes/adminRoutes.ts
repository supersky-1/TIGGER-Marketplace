import { Router } from "express";
import {
  getAdminStats,
  getAllSellers,
  getManagedUsers,
  getManagedProducts,
  setUserSuspension,
  setProductModeration,
  getAdminAuditLog,
} from "../controllers/adminController";
import { getAdminLedger } from "../controllers/payoutController";
import { protect, adminOnly } from "../middleware/auth";

const router = Router();

router.get("/stats", protect, adminOnly, getAdminStats);
router.get("/sellers", protect, adminOnly, getAllSellers);
router.get("/users", protect, adminOnly, getManagedUsers);
router.patch("/users/:userId/suspension", protect, adminOnly, setUserSuspension);
router.get("/products", protect, adminOnly, getManagedProducts);
router.patch("/products/:productId/moderation", protect, adminOnly, setProductModeration);
router.get("/audit", protect, adminOnly, getAdminAuditLog);
router.get("/ledger", protect, adminOnly, getAdminLedger);

export default router;
