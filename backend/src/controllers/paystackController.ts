import { Request, Response } from "express";
import crypto from "crypto";
import Payment from "../models/Payment";
import { settleVerifiedPayment } from "../services/paymentSettlement";

interface PaystackWebhookRequest extends Request {
  rawBody?: Buffer;
}

export const paystackWebhook = async (req: PaystackWebhookRequest, res: Response) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const signature = req.header("x-paystack-signature");
  if (!secret || !signature || !req.rawBody) {
    return res.status(400).json({ message: "Invalid webhook request" });
  }

  const expected = crypto.createHmac("sha512", secret).update(req.rawBody).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "hex");
  } catch {
    return res.status(400).json({ message: "Invalid webhook signature" });
  }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return res.status(401).json({ message: "Invalid webhook signature" });
  }

  const event = req.body as {
    event?: string;
    data?: { reference?: string; status?: string; currency?: string; amount?: number };
  };
  if (event.event !== "charge.success") return res.sendStatus(200);

  const reference = event.data?.reference;
  const amountPesewas = event.data?.amount;
  if (
    typeof reference !== "string" ||
    event.data?.status !== "success" ||
    event.data.currency !== "GHS" ||
    !Number.isSafeInteger(amountPesewas) ||
    (amountPesewas ?? 0) <= 0
  ) {
    return res.status(400).json({ message: "Invalid successful charge event" });
  }

  try {
    const payment = await Payment.findOne({ provider: "paystack_telecel", providerReference: reference });
    if (!payment) return res.sendStatus(200);
    await settleVerifiedPayment({
      paymentId: payment._id.toString(),
      transactionId: reference,
      amount: amountPesewas! / 100,
    });
    return res.sendStatus(200);
  } catch (error) {
    console.error("Paystack webhook settlement failed:", error);
    return res.sendStatus(500);
  }
};
