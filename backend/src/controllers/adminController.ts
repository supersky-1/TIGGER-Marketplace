import { Response } from "express";
import mongoose from "mongoose";
import User from "../models/User";
import Product from "../models/Product";
import Order from "../models/Order";
import AdminAuditLog from "../models/AdminAuditLog";
import { AuthRequest } from "../middleware/auth";

export const getAdminStats = async (req: AuthRequest, res: Response) => {
  try {
    // Only admin can access
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const totalBuyers = await User.countDocuments({
      $or: [
        { role: { $regex: /^(buyer|customer)$/i } },
        { role: { $exists: false } },
      ],
    });
    const totalSellers = await User.countDocuments({ role: "seller" });
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();

    // Calculate total revenue from paid orders
    const paidOrders = await Order.find({ status: { $in: ["paid", "shipped", "delivered"] } });
    const totalRevenue = paidOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );

    // Platform fee 12.5%
    const platformFee = totalRevenue * 0.125;

    res.json({
      totalBuyers,
      totalSellers,
      totalProducts,
      totalOrders,
      totalRevenue,
      platformFee,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllSellers = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const sellers = await User.find({ role: "seller" }).select(
      "name email createdAt"
    );

    // Get revenue per seller
    const sellersWithStats = await Promise.all(
      sellers.map(async (seller) => {
        const products = await Product.find({ seller: seller._id }).select("_id");
        const productIds = products.map((p) => p._id);

        const orders = await Order.find({
          "items.product": { $in: productIds },
          status: { $in: ["paid", "shipped", "delivered"] },
        });

        const revenue = orders.reduce((sum, order) => sum + order.items.reduce(
          (sellerTotal, item) => productIds.some((id) => id.toString() === item.product.toString())
            ? sellerTotal + Math.round(item.price * 100) * item.quantity
            : sellerTotal,
          0
        ), 0) / 100;
        const fee = revenue * 0.125;

        return {
          id: seller._id,
          name: seller.name,
          email: seller.email,
          joined: seller.createdAt,
          totalOrders: orders.length,
          revenue,
          platformFee: fee,
        };
      })
    );

    res.json(sellersWithStats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getManagedUsers = async (_req: AuthRequest, res: Response) => {
  try {
    const users = await User.find({ role: { $in: ["buyer", "seller"] } })
      .select("name email role isSuspended suspensionReason verificationStatus createdAt")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getManagedProducts = async (_req: AuthRequest, res: Response) => {
  try {
    const products = await Product.find()
      .populate("seller", "name email")
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const setUserSuspension = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  try {
    const { userId } = req.params;
    const { suspended, reason } = req.body;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    if (typeof suspended !== "boolean") {
      return res.status(400).json({ message: "Suspended must be true or false" });
    }
    if (typeof reason !== "string" || reason.trim().length < 3) {
      return res.status(400).json({ message: "Provide a reason of at least 3 characters" });
    }

    let targetName = "";
    await session.withTransaction(async () => {
      const target = await User.findOne({
        _id: userId,
        role: { $in: ["buyer", "seller"] },
      }).session(session);
      if (!target) {
        throw new Error("MANAGED_USER_NOT_FOUND");
      }
      if (target.isSuspended === suspended) {
        throw new Error("SUSPENSION_STATE_UNCHANGED");
      }

      target.isSuspended = suspended;
      target.suspensionReason = suspended ? reason.trim() : undefined;
      await target.save({ session });
      targetName = target.name;

      await AdminAuditLog.create([{
        admin: req.user!.userId,
        action: suspended ? "user_suspended" : "user_reactivated",
        targetUser: target._id,
        targetName,
        reason: reason.trim(),
      }], { session });
    });

    res.json({ message: suspended ? "User suspended" : "User reactivated", targetName });
  } catch (error) {
    if (error instanceof Error && error.message === "MANAGED_USER_NOT_FOUND") {
      return res.status(404).json({ message: "Buyer or seller account not found" });
    }
    if (error instanceof Error && error.message === "SUSPENSION_STATE_UNCHANGED") {
      return res.status(409).json({ message: "User already has that account status" });
    }
    console.error(error);
    res.status(500).json({ message: "Server error" });
  } finally {
    await session.endSession();
  }
};

export const setProductModeration = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  try {
    const { productId } = req.params;
    const { active, reason } = req.body;
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }
    if (typeof active !== "boolean") {
      return res.status(400).json({ message: "Active must be true or false" });
    }
    if (typeof reason !== "string" || reason.trim().length < 3) {
      return res.status(400).json({ message: "Provide a reason of at least 3 characters" });
    }

    let targetName = "";
    await session.withTransaction(async () => {
      const product = await Product.findById(productId).session(session);
      if (!product) {
        throw new Error("PRODUCT_NOT_FOUND");
      }
      if (product.isActive === active) {
        throw new Error("PRODUCT_STATE_UNCHANGED");
      }

      product.isActive = active;
      await product.save({ session });
      targetName = product.name;

      await AdminAuditLog.create([{
        admin: req.user!.userId,
        action: active ? "product_restored" : "product_removed",
        targetProduct: product._id,
        targetName,
        reason: reason.trim(),
      }], { session });
    });

    res.json({ message: active ? "Product restored" : "Product removed", targetName });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return res.status(404).json({ message: "Product not found" });
    }
    if (error instanceof Error && error.message === "PRODUCT_STATE_UNCHANGED") {
      return res.status(409).json({ message: "Product already has that listing status" });
    }
    console.error(error);
    res.status(500).json({ message: "Server error" });
  } finally {
    await session.endSession();
  }
};

export const getAdminAuditLog = async (_req: AuthRequest, res: Response) => {
  try {
    const entries = await AdminAuditLog.find()
      .populate("admin", "name email")
      .populate("targetUser", "name email")
      .populate("targetProduct", "name")
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(entries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
