import { Response } from "express";
import mongoose from "mongoose";
import Order from "../models/Order";
import Product from "../models/Product";
import Payout from "../models/Payout";
import Payment from "../models/Payment";
import User from "../models/User";
import AdminAuditLog from "../models/AdminAuditLog";
import { AuthRequest } from "../middleware/auth";
import { createNotification } from "./notificationController";

// Get seller's current balance and available payout
export const getSellerBalance = async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.user?.userId;

    // Get all products of this seller
    const products = await Product.find({ seller: sellerId }).select("_id");
    const productIds = products.map((p) => p._id);

    // Get all paid orders that contain these products
    const paidOrders = await Order.find({
      "items.product": { $in: productIds },
      status: { $in: ["paid", "shipped", "delivered"] },
    });

    // Calculate total gross revenue
    let grossRevenue = 0;
    paidOrders.forEach((order) => {
      order.items.forEach((item) => {
        if (productIds.some((id) => id.toString() === item.product.toString())) {
          grossRevenue += item.price * item.quantity;
        }
      });
    });

    // Get already paid/pending payouts
    const previousPayouts = await Payout.find({
      seller: sellerId,
      status: { $in: ["pending", "processing", "paid"] },
    });

    const alreadyPaid = previousPayouts.reduce(
      (sum, p) => sum + p.grossAmount,
      0
    );

    const availableGross = Math.max(0, grossRevenue - alreadyPaid);
    const platformFee = availableGross * 0.125;
    const availableBalance = availableGross - platformFee;

    res.json({
      grossRevenue,
      alreadyPaid,
      availableGross,
      platformFee,
      availableBalance,
      canWithdraw: availableBalance > 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Seller requests a payout
export const requestPayout = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  try {
    const sellerId = req.user?.userId;
    let payoutId: mongoose.Types.ObjectId | undefined;
    let failure: "NO_BALANCE" | "PENDING" | "SELLER_MISSING" | undefined;
    await session.withTransaction(async () => {
      failure = undefined;
      payoutId = undefined;
      // Serialize payout requests for this seller. Concurrent requests conflict on
      // this write, then the retried transaction sees the reservation just made.
      const lock = await User.updateOne(
        { _id: sellerId },
        { $inc: { payoutRequestVersion: 1 } },
        { session }
      );
      if (lock.matchedCount !== 1) {
        failure = "SELLER_MISSING";
        return;
      }

      const products = await Product.find({ seller: sellerId }).select("_id").session(session);
      const productIds = products.map((p) => p._id);
      const paidOrders = await Order.find({
        "items.product": { $in: productIds },
        status: { $in: ["paid", "shipped", "delivered"] },
      }).session(session);

      let revenueCents = 0;
      for (const order of paidOrders) {
        for (const item of order.items) {
          if (productIds.some((id) => id.toString() === item.product.toString())) {
            revenueCents += Math.round(item.price * 100) * item.quantity;
          }
        }
      }
      const previousPayouts = await Payout.find({
        seller: sellerId,
        status: { $in: ["pending", "processing", "paid"] },
      }).session(session);
      const reservedCents = previousPayouts.reduce((sum, p) => sum + Math.round(p.grossAmount * 100), 0);
      const availableGrossCents = Math.max(0, revenueCents - reservedCents);
      if (availableGrossCents <= 0) {
        failure = "NO_BALANCE";
        return;
      }
      if (previousPayouts.some((p) => p.status === "pending")) {
        failure = "PENDING";
        return;
      }

      const grossAmount = availableGrossCents / 100;
      const feeCents = Math.round(availableGrossCents * 0.125);
      const now = new Date();
      const periodStart = new Date(now);
      periodStart.setDate(now.getDate() - 14);
      const [payout] = await Payout.create([{
        seller: sellerId,
        amount: (availableGrossCents - feeCents) / 100,
        fee: feeCents / 100,
        grossAmount,
        status: "pending",
        periodStart,
        periodEnd: now,
      }], { session });
      payoutId = payout._id;
    });

    if (failure === "SELLER_MISSING") return res.status(404).json({ message: "Seller account not found" });
    if (failure === "NO_BALANCE") return res.status(400).json({ message: "No available balance to withdraw" });
    if (failure === "PENDING") return res.status(400).json({ message: "You already have a pending payout request" });
    if (!payoutId) throw new Error("Payout transaction did not return a saved record");
    const payout = await Payout.findById(payoutId);

    res.status(201).json({
      message: "Payout request submitted and is pending admin approval",
      payout,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  } finally {
    await session.endSession();
  }
};

// Get seller's payout history
export const getMyPayouts = async (req: AuthRequest, res: Response) => {
  try {
    const payouts = await Payout.find({ seller: req.user?.userId }).sort({
      createdAt: -1,
    });
    res.json(payouts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: Get all payout requests
export const getAllPayouts = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admins only" });
    }

    const payouts = await Payout.find()
      .populate("seller", "name email")
      .sort({ createdAt: -1 });

    res.json(payouts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: Update payout status
export const updatePayoutStatus = async (req: AuthRequest, res: Response) => {
  let session: mongoose.ClientSession | undefined;
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admins only" });
    }

    const { payoutId } = req.params;
    const { status, note } = req.body;
    const normalizedNote = typeof note === "string" ? note.trim() : "";

    if (!mongoose.isValidObjectId(payoutId)) {
      return res.status(400).json({ message: "Invalid payout ID" });
    }
    if (!["processing", "paid", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const current = await Payout.findById(payoutId);
    if (!current) {
      return res.status(404).json({ message: "Payout not found" });
    }

    const transitions: Record<string, string[]> = {
      pending: ["processing", "rejected"],
      processing: ["paid"],
      paid: [],
      rejected: [],
    };
    if (!transitions[current.status]?.includes(status)) {
      return res.status(409).json({
        message: current.status === "pending"
          ? "Approve or reject a pending payout first"
          : "Invalid payout status transition",
      });
    }
    if (status === "rejected" && normalizedNote.length < 3) {
      return res.status(400).json({ message: "A rejection reason of at least 3 characters is required" });
    }

    const now = new Date();
    const update: Record<string, unknown> = { status };
    if (current.status === "pending") {
      update.reviewedBy = req.user?.userId;
      update.reviewedAt = now;
    }
    if (normalizedNote) update.adminNote = normalizedNote;
    if (status === "paid") {
      update.releasedBy = req.user?.userId;
      update.releasedAt = now;
    }

    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      const updated = await Payout.findOneAndUpdate(
        { _id: payoutId, status: current.status },
        { $set: update },
      { returnDocument: "after", session }
      );
      if (!updated) throw new Error("PAYOUT_CHANGED_CONCURRENTLY");

      await AdminAuditLog.create([{
        admin: req.user!.userId,
        action: status === "processing"
          ? "payout_approved"
          : status === "rejected"
            ? "payout_rejected"
            : "payout_released",
        targetPayout: updated._id,
        targetName: `Payout ${updated._id.toString().slice(-6).toUpperCase()}`,
        reason: normalizedNote || (status === "processing" ? "Approved for payment" : "Payout released"),
      }], { session });
    });

    const payout = await Payout.findById(payoutId).populate("seller", "name email");
    const seller = payout?.seller as unknown as { _id: mongoose.Types.ObjectId } | null;
    if (seller) {
      const notification = status === "processing"
        ? ["Payout Approved", "Your payout request was approved and is awaiting release."]
        : status === "rejected"
          ? ["Payout Rejected", normalizedNote]
          : ["Payout Released", "Your payout has been marked as released by the admin."];
      await createNotification(
        seller._id.toString(),
        notification[0],
        notification[1],
        "payout",
        "/seller/payouts"
      );
    }
    res.json(payout);
  } catch (error) {
    if (error instanceof Error && error.message === "PAYOUT_CHANGED_CONCURRENTLY") {
      return res.status(409).json({ message: "Payout status changed; refresh and try again" });
    }
    console.error(error);
    res.status(500).json({ message: "Server error" });
  } finally {
    await session?.endSession();
  }
};

export const getAdminLedger = async (_req: AuthRequest, res: Response) => {
  try {
    const [payments, payouts, sellers] = await Promise.all([
      Payment.find().populate("buyer", "name email").sort({ createdAt: -1 }),
      Payout.find().populate("seller", "name email").sort({ createdAt: -1 }),
      User.find({ role: "seller" }).select("name businessName email").sort({ createdAt: -1 }),
    ]);

    const transactions = [
      ...payments.map((payment) => {
        const buyer = payment.buyer as unknown as { name: string; email: string } | null;
        return {
          id: payment._id.toString(),
          reference: payment.order.toString(),
          type: "Customer payment",
          party: buyer?.name ?? "Unknown buyer",
          email: buyer?.email ?? "",
          grossAmount: payment.amount,
          fee: 0,
          netAmount: payment.amount,
          status: payment.status,
          createdAt: payment.createdAt,
        };
      }),
      ...payouts.map((payout) => {
        const seller = payout.seller as unknown as { name: string; email: string } | null;
        return {
          id: payout._id.toString(),
          reference: payout._id.toString(),
          type: "Seller payout",
          party: seller?.name ?? "Unknown seller",
          email: seller?.email ?? "",
          grossAmount: payout.grossAmount,
          fee: payout.fee,
          netAmount: payout.amount,
          status: payout.status,
          createdAt: payout.createdAt,
        };
      }),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - 14 * 24 * 60 * 60 * 1000);
    const orders = await Order.find({
      status: { $in: ["paid", "shipped", "delivered"] },
      createdAt: { $gte: periodStart, $lte: periodEnd },
    }).select("items.product items.price items.quantity");

    const productIds = [...new Set(orders.flatMap((order) =>
      order.items.map((item) => item.product.toString())
    ))];
    const products = await Product.find({ _id: { $in: productIds } }).select("seller");
    const sellerByProduct = new Map(
      products.map((product) => [product._id.toString(), product.seller.toString()])
    );
    const grossBySeller = new Map<string, { cents: number; orderIds: Set<string> }>();

    for (const order of orders) {
      for (const item of order.items) {
        const sellerId = sellerByProduct.get(item.product.toString());
        if (!sellerId) continue;
        const current = grossBySeller.get(sellerId) ?? { cents: 0, orderIds: new Set<string>() };
        current.cents += Math.round(item.price * 100) * item.quantity;
        current.orderIds.add(order._id.toString());
        grossBySeller.set(sellerId, current);
      }
    }

    const businessIncome = sellers.map((seller) => {
      const income = grossBySeller.get(seller._id.toString());
      return {
        sellerId: seller._id.toString(),
        businessName: seller.businessName || seller.name,
        name: seller.name,
        email: seller.email,
        orderCount: income?.orderIds.size ?? 0,
        grossIncome: (income?.cents ?? 0) / 100,
      };
    });

    res.json({ transactions, businessIncome, periodStart, periodEnd });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
