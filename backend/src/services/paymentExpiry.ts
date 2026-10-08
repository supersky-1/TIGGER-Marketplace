import mongoose from "mongoose";
import Order from "../models/Order";
import Payment from "../models/Payment";
import Product from "../models/Product";
import { createNotification } from "../controllers/notificationController";

const PAYMENT_WINDOW_MS = 15 * 60 * 1000;

export const expirePendingPayments = async () => {
  const now = new Date();
  const cutoff = new Date(now.getTime() - PAYMENT_WINDOW_MS);
  const expirationFilter = {
    $or: [
      { expiresAt: { $lte: now } },
      { expiresAt: { $exists: false }, createdAt: { $lte: cutoff } },
    ],
  };
  const duePayments = await Payment.find({
    status: "pending",
    ...expirationFilter,
  }).select("_id order buyer");

  for (const payment of duePayments) {
    const session = await mongoose.startSession();
    let orderExpired = false;
    try {
      await session.withTransaction(async () => {
        const result = await Payment.updateOne(
          { _id: payment._id, status: "pending", ...expirationFilter },
          { $set: { status: "failed" } },
          { session }
        );
        if (result.matchedCount !== 1) return;

        const order = await Order.findOne({
          _id: payment.order,
          status: "pending",
        }).session(session);
        if (!order) return;

        for (const item of order.items) {
          await Product.updateOne(
            { _id: item.product },
            { $inc: { stock: item.quantity } },
            { session }
          );
        }

        order.status = "cancelled";
        order.sellerFulfillments.forEach((fulfillment) => { fulfillment.status = "cancelled"; });
        await order.save({ session });
        orderExpired = true;
      });

      if (orderExpired) {
        await createNotification(
          payment.buyer.toString(),
          "Order Expired",
          `Your order #${payment.order.toString().slice(-6).toUpperCase()} was cancelled because payment was not completed in time.`,
          "order",
          "/orders"
        );
      }
    } finally {
      await session.endSession();
    }
  }
};
