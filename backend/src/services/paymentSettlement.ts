import mongoose from "mongoose";
import Order from "../models/Order";
import Payment from "../models/Payment";
import AdminAuditLog from "../models/AdminAuditLog";
import { createNotification } from "../controllers/notificationController";

/**
 * Settle a payment only after an authorized source has confirmed its transaction
 * details. This is called by provider integrations or the admin manual review flow.
 */
export const settleVerifiedPayment = async (input: {
  paymentId: string;
  transactionId: string;
  amount: number;
  manualReview?: { adminId: string; note: string };
}) => {
  if (
    !mongoose.isValidObjectId(input.paymentId) ||
    typeof input.transactionId !== "string" ||
    !input.transactionId.trim() ||
    input.transactionId.length > 200
  ) {
    throw new Error("INVALID_PAYMENT_REFERENCE");
  }
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    throw new Error("INVALID_PAYMENT_AMOUNT");
  }

  const session = await mongoose.startSession();
  let buyerId = "";
  let orderId = "";
  let alreadySettled = false;
  try {
    await session.withTransaction(async () => {
      const payment = await Payment.findById(input.paymentId).session(session);
      if (!payment) throw new Error("PAYMENT_NOT_FOUND");

      if (payment.status === "successful") {
        if (payment.transactionId !== input.transactionId || Math.round(input.amount * 100) !== Math.round(payment.amount * 100)) {
          throw new Error("PAYMENT_ALREADY_SETTLED_DIFFERENTLY");
        }
        buyerId = payment.buyer.toString();
        orderId = payment.order.toString();
        alreadySettled = true;
        return;
      }
      if (payment.status !== "pending" || payment.expiresAt.getTime() <= Date.now()) {
        throw new Error("PAYMENT_NOT_PAYABLE");
      }
      if (Math.round(input.amount * 100) !== Math.round(payment.amount * 100)) {
        throw new Error("PAYMENT_AMOUNT_MISMATCH");
      }

      const order = await Order.findOne({ _id: payment.order, buyer: payment.buyer, status: "pending" }).session(session);
      if (!order || Math.round(order.totalAmount * 100) !== Math.round(payment.amount * 100)) {
        throw new Error("ORDER_NOT_PAYABLE");
      }
      const paymentUpdate = await Payment.updateOne(
        { _id: payment._id, status: "pending", expiresAt: { $gt: new Date() } },
        { $set: { status: "successful", transactionId: input.transactionId } },
        { session }
      );
      if (paymentUpdate.matchedCount !== 1) throw new Error("PAYMENT_NOT_PAYABLE");

      const orderUpdate = await Order.updateOne(
        { _id: order._id, status: "pending" },
        { $set: { status: "paid", "sellerFulfillments.$[].status": "paid" } },
        { session }
      );
      if (orderUpdate.matchedCount !== 1) throw new Error("ORDER_NOT_PAYABLE");
      if (input.manualReview) {
        await Payment.updateOne(
          { _id: payment._id, status: "successful" },
          { $set: {
            reviewedBy: input.manualReview.adminId,
            reviewedAt: new Date(),
            reviewNote: input.manualReview.note,
          } },
          { session }
        );
        await AdminAuditLog.create([{
          admin: input.manualReview.adminId,
          action: "payment_approved",
          targetPayment: payment._id,
          targetName: `Payment ${payment._id.toString().slice(-6).toUpperCase()}`,
          reason: input.manualReview.note,
        }], { session });
      }
      buyerId = payment.buyer.toString();
      orderId = payment.order.toString();
    });
  } finally {
    await session.endSession();
  }

  if (!alreadySettled) {
    await createNotification(
      buyerId,
      "Payment Confirmed",
      `Payment for order #${orderId.slice(-6).toUpperCase()} was confirmed.`,
      "order",
      "/orders"
    );
  }

  return { paymentId: input.paymentId, orderId, alreadySettled };
};
