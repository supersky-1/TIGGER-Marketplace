import { Router } from "express";
import {
  register,
  login,
  getProfile,
  updateSellerProfile,
} from "../controllers/authController";
import { protect } from "../middleware/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/profile", protect, getProfile);
router.patch("/profile", protect, updateSellerProfile);

export default router;
