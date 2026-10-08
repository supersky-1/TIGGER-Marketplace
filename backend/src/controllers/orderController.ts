import { Response } from "express";
import mongoose from "mongoose";
import Order from "../models/Order";
import Product from "../models/Product";
import Payment from "../models/Payment";
import User from "../models/User";
import { AuthRequest } from "../middleware/auth";
import { createNotification } from "./notificationController";
import { initializeTelecelCharge, PaystackRequestError } from "../services/paystack";
import { cancelPendingPaymentAndReleaseStock } from "../services/paymentCancellation";
import { settleVerifiedPayment } from "../services/paymentSettlement";

const normalizeGhanaPhone = (value: string) => {
  const compact = value.replace(/[\s()-]/g, "");
  if (/^0[235]\d{8}$/.test(compact)) return compact;
  if (/^\+233[235]\d{8}$/.test(compact)) return `0${compact.slice(4)}`;
  return null;
};

export const createOrder = async (req: AuthRequest, res: Response) => {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    return res.status(503).json({ message: "Mobile Money payments are not configured" });
  }
  const session = await mongoose.startSession();
  try {
    const { items, phoneNumber } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Add at least one item to the order" });
    }

    if (typeof phoneNumber !== "string" || !normalizeGhanaPhone(phoneNumber)) {
      return res.status(400).json({ message: "Enter a valid Ghana mobile number" });
    }
    const normalizedPhoneNumber = normalizeGhanaPhone(phoneNumber)!;

    const quantities = new Map<string, number>();
    for (const item of items) {
      const productId = typeof item?.product === "string" ? item.product : "";
      const quantity = item?.quantity;

      if (!mongoose.isValidObjectId(productId)) {
        return res.status(400).json({ message: "An order contains an invalid product" });
      }
      if (!Number.isSafeInteger(quantity) || quantity <= 0) {
        return res.status(400).json({ message: "Item quantities must be positive whole numbers" });
      }

      const normalizedProductId = productId.toLowerCase();
      const combinedQuantity = (quantities.get(normalizedProductId) ?? 0) + quantity;
      if (!Number.isSafeInteger(combinedQuantity)) {
        return res.status(400).json({ message: "Combined item quantity is too large" });
      }
      quantities.set(
        normalizedProductId,
        combinedQuantity
      );
    }

    const productIds = [...quantities.keys()];
    const orderId = new mongoose.Types.ObjectId();
    const paymentId = new mongoose.Types.ObjectId();
    let sellerNotifications: Array<{ sellerId: string; productName: string; quantity: number }> = [];

    await session.withTransaction(async () => {
      const products = await Product.find({
        _id: { $in: productIds },
        isActive: { $ne: false },
      }).session(session);

      if (products.length !== productIds.length) {
        throw new Error("PRODUCT_UNAVAILABLE");
      }

      const productSellerIds = [...new Set(products.map((product) => product.seller.toString()))];
      const activeSellers = await User.find({
        _id: { $in: productSellerIds },
        isSuspended: { $ne: true },
      }).select("_id").session(session);
      if (activeSellers.length !== productSellerIds.length) {
        throw new Error("PRODUCT_UNAVAILABLE");
      }

      const orderItems = productIds.map((productId) => {
        const product = products.find((candidate) => candidate._id.toString() === productId)!;
        return {
          product: product._id,
          seller: product.seller,
          name: product.name,
          price: product.price,
          quantity: quantities.get(productId)!,
        };
      });
      const totalCents = orderItems.reduce(
        (sum, item) => sum + Math.round(item.price * 100) * item.quantity,
        0
      );
      const totalAmount = totalCents / 100;

      for (const [productId, quantity] of quantities) {
        const result = await Product.updateOne(
          { _id: productId, stock: { $gte: quantity }, isActive: { $ne: false } },
          { $inc: { stock: -quantity } },
          { session }
        );

        if (result.matchedCount !== 1) {
          throw new Error("INSUFFICIENT_STOCK");
        }
      }

      await Order.create([{
        _id: orderId,
        buyer: req.user?.userId,
        items: orderItems,
        sellerFulfillments: [...new Set(products.map((product) => product.seller.toString()))].map((seller) => ({ seller, status: "pending" })),
        totalAmount,
        status: "pending",
      }], { session });
      await Payment.create([{
        _id: paymentId,
        order: orderId,
        buyer: req.user?.userId,
        amount: totalAmount,
        phoneNumber: normalizedPhoneNumber,
        provider: "paystack_telecel",
        providerReference: `TRG-${paymentId.toString()}`,
        status: "pending",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      }], { session });

      sellerNotifications = products.map((product) => ({
        sellerId: product.seller.toString(),
        productName: product.name,
        quantity: quantities.get(product._id.toString())!,
      }));
    });

    const [order, payment] = await Promise.all([
      Order.findById(orderId),
      Payment.findById(paymentId),
    ]);
    if (!order || !payment) {
      throw new Error("Order transaction did not return saved records");
    }

    const buyer = await User.findById(req.user?.userId).select("email");
    if (!buyer?.email) {
      await cancelPendingPaymentAndReleaseStock(payment._id.toString(), "Buyer account email is unavailable");
      return res.status(400).json({ message: "A valid email address is required for Mobile Money checkout" });
    }

    let charge;
    try {
      charge = await initializeTelecelCharge({
        email: buyer.email,
        phoneNumber: normalizedPhoneNumber,
        amountPesewas: Math.round(payment.amount * 100),
        orderId: order._id.toString(),
        paymentId: payment._id.toString(),
      });
    } catch (chargeError) {
      if (chargeError instanceof PaystackRequestError && chargeError.definitiveRejection) {
        await cancelPendingPaymentAndReleaseStock(payment._id.toString(), chargeError.message);
        return res.status(502).json({ message: "Paystack could not start the Mobile Money request", detail: chargeError.message });
      }
      await Payment.updateOne({ _id: payment._id, status: "pending" }, {
        $set: { providerStatus: "pending", providerMessage: "Payment request status is not yet known. Check your phone and refresh My Orders." },
      });
      return res.status(202).json({
        message: "Order created. Payment request is being checked; look for a Telecel Cash prompt and check My Orders for status.",
        order,
        payment: { _id: payment._id, status: "pending", providerStatus: "pending" },
      });
    }

    await Payment.updateOne({ _id: payment._id, status: "pending" }, {
      $set: {
        providerReference: charge.data!.reference,
        providerStatus: charge.data!.status,
        providerMessage: charge.data!.display_text || charge.data!.message || charge.message,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    if (["failed", "timeout", "abandoned"].includes(charge.data!.status)) {
      await cancelPendingPaymentAndReleaseStock(payment._id.toString(), charge.data!.message || "Mobile Money authorization failed");
      return res.status(402).json({ message: charge.data!.display_text || charge.data!.message || "Mobile Money authorization failed" });
    }

    if (charge.data!.status === "success") {
      await Payment.updateOne({ _id: payment._id, status: "pending" }, { $set: { providerReference: charge.data!.reference } });
      await settleVerifiedPayment({ paymentId: payment._id.toString(), transactionId: charge.data!.reference, amount: payment.amount });
    }

    // Notifications are best-effort and only sent after the charge request was accepted.
    await Promise.all(sellerNotifications.map((notification) => createNotification(
      notification.sellerId,
      "New Order Placed",
      `A buyer placed an order for "${notification.productName}" (Qty: ${notification.quantity}). Payment authorization is pending.`,
      "order",
      "/seller/dashboard"
    )));

    return res.status(201).json({
      message: charge.data!.display_text || "A Telecel Cash authorization prompt has been sent to your phone.",
      order,
      payment: {
        _id: payment._id,
        amount: payment.amount,
        status: charge.data!.status === "success" ? "successful" : "pending",
        providerStatus: charge.data!.status,
        providerMessage: charge.data!.display_text || charge.message,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_UNAVAILABLE") {
      return res.status(400).json({ message: "One or more products are unavailable" });
    }
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
      return res.status(409).json({ message: "One or more products no longer have enough stock" });
    }
    console.error(error);
    res.status(500).json({ message: "Server error" });
  } finally {
    await session.endSession();
  }
};

export const getSellerOrders = async (req: AuthRequest, res: Response) => {
  try {
    const orders = await Order.find({ "sellerFulfillments.seller": req.user?.userId })
      .populate("buyer", "name email")
      .sort({ createdAt: -1 });
    res.json(orders.map((order) => {
      const sellerItems = order.items.filter((item) => item.seller?.toString() === req.user?.userId);
      const fulfillment = order.sellerFulfillments.find((entry) => entry.seller.toString() === req.user?.userId);
      return {
        ...order.toObject(),
        items: sellerItems,
        totalAmount: sellerItems.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0) / 100,
        sellerStatus: fulfillment?.status ?? order.status,
      };
    }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getMyOrders = async (req: AuthRequest, res: Response) => {
  try {
    const orders = await Order.find({ buyer: req.user?.userId }).sort({
      createdAt: -1,
    });
    const payments = await Payment.find({ order: { $in: orders.map((order) => order._id) } });
    const paymentByOrder = new Map(payments.map((payment) => [payment.order.toString(), payment]));
    res.json(orders.map((order) => {
      const payment = paymentByOrder.get(order._id.toString());
      return {
        ...order.toObject(),
        payment: payment ? {
          _id: payment._id,
          status: payment.status,
          amount: payment.amount,
          provider: payment.provider,
          providerReference: payment.providerReference,
          providerStatus: payment.providerStatus,
          providerMessage: payment.providerMessage,
          expiresAt: payment.expiresAt,
        } : null,
      };
    }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["shipped", "delivered"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }
    const order = await Order.findOne({ _id: orderId, "sellerFulfillments.seller": req.user?.userId });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    const currentFulfillment = order.sellerFulfillments.find((entry) => entry.seller.toString() === req.user?.userId);
    if (!currentFulfillment) {
      return res.status(403).json({ message: "You do not have permission to update this order" });
    }
    const expectedStatus = status === "shipped" ? "paid" : "shipped";
    if (currentFulfillment.status !== expectedStatus) {
      return res.status(409).json({ message: "Seller fulfillment must be paid before shipping and shipped before delivery" });
    }
    const updated = await Order.findOneAndUpdate(
      {
        _id: orderId,
        sellerFulfillments: { $elemMatch: { seller: req.user?.userId, status: expectedStatus } },
      },
      { $set: { "sellerFulfillments.$.status": status } },
      { returnDocument: "after" }
    );
    if (!updated) {
      return res.status(409).json({ message: "Seller fulfillment changed; refresh and try again" });
    }

    const fulfillmentStatuses = updated.sellerFulfillments.map((entry) => entry.status);
    if (fulfillmentStatuses.length && fulfillmentStatuses.every((value) => value === "delivered")) {
      await Order.updateOne({ _id: updated._id, status: { $in: ["shipped", "paid"] } }, { $set: { status: "delivered" } });
    } else if (fulfillmentStatuses.length && fulfillmentStatuses.every((value) => value === "shipped" || value === "delivered")) {
      await Order.updateOne({ _id: updated._id, status: "paid" }, { $set: { status: "shipped" } });
    }

    // Notify the buyer about status change
    await createNotification(
      updated.buyer.toString(),
      "Order Status Updated",
      `The seller has marked their items in order #${updated._id.toString().slice(-6).toUpperCase()} as "${status}".`,
      "order",
      "/orders"
    );

    res.json({ ...updated.toObject(), sellerStatus: status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
