import { Router } from "express";
import {
  createProduct,
  getMyProducts,
  getAllProducts,
  updateMyProduct,
  removeMyProduct,
} from "../controllers/productController";
import { protect, verifiedSellerOnly } from "../middleware/auth";
import upload from "../middleware/upload";

const router = Router();

// Public route
router.get("/", getAllProducts);

// Protected routes
router.post("/", protect, verifiedSellerOnly, upload.single("image"), createProduct);
router.get("/my-products", protect, verifiedSellerOnly, getMyProducts);
router.patch("/:productId", protect, verifiedSellerOnly, updateMyProduct);
router.delete("/:productId", protect, verifiedSellerOnly, removeMyProduct);

export default router;
