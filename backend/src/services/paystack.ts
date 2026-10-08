export interface PaystackCharge {
  status: boolean;
  message: string;
  data?: {
    reference: string;
    status: string;
    display_text?: string;
    message?: string;
  };
}

export class PaystackRequestError extends Error {
  constructor(message: string, public readonly definitiveRejection = false) {
    super(message);
  }
}

export const initializeTelecelCharge = async (input: {
  email: string;
  phoneNumber: string;
  amountPesewas: number;
  orderId: string;
  paymentId: string;
}): Promise<PaystackCharge> => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) throw new PaystackRequestError("PAYSTACK_NOT_CONFIGURED");

  const reference = `TRG-${input.paymentId}`;
  const response = await fetch("https://api.paystack.co/charge", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: String(input.amountPesewas),
      currency: "GHS",
      mobile_money: { phone: input.phoneNumber, provider: "vod" },
      reference,
      metadata: { orderId: input.orderId, paymentId: input.paymentId },
    }),
    signal: AbortSignal.timeout(15_000),
  });

  let result: PaystackCharge;
  try {
    result = await response.json() as PaystackCharge;
  } catch {
    throw new PaystackRequestError("PAYSTACK_INVALID_RESPONSE");
  }
  if (!response.ok || !result.status || !result.data?.reference || !result.data.status) {
    throw new PaystackRequestError(result?.message || "PAYSTACK_CHARGE_REJECTED", !response.ok || result?.status === false);
  }
  return result;
};
