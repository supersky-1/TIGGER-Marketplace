import mongoose from "mongoose";
import Order from "../models/Order";
import Payment from "../models/Payment";
import Product from "../models/Product";
import { createNotification } from "../controllers/notificationController";

export const cancelPendingPaymentAndReleaseStock = async (paymentId: string, reason: string) => {
  const session = await mongoose.startSession();
  let buyerId = "";
  let orderId = "";
  try {
    await session.withTransaction(async () => {
      const payment = await Payment.findOne({ _id: paymentId, status: "pending" }).session(session);
      if (!payment) return;
      const order = await Order.findOne({ _id: payment.order, status: "pending" }).session(session);
      if (!order) return;
      const result = await Payment.updateOne(
        { _id: payment._id, status: "pending" },
        { $set: { status: "failed", providerStatus: "failed", providerMessage: reason.slice(0, 500) } },
        { session }
      );
      if (result.matchedCount !== 1) return;
      for (const item of order.items) {
        await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }, { session });
      }
      order.status = "cancelled";
      order.sellerFulfillments.forEach((fulfillment) => { fulfillment.status = "cancelled"; });
      await order.save({ session });
      buyerId = payment.buyer.toString();
      orderId = payment.order.toString();
    });
  } finally {
    await session.endSession();
  }
  if (buyerId && orderId) {
    await createNotification(
      buyerId,
      "Payment Failed",
      `Payment for order #${orderId.slice(-6).toUpperCase()} failed. The order was cancelled and its stock reservation released.`,
      "order",
      "/orders"
    );
  }
};
