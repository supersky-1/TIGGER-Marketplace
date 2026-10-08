import mongoose, { Schema, Document } from "mongoose";

export interface IPayment extends Document {
  order: mongoose.Types.ObjectId;
  buyer: mongoose.Types.ObjectId;
  amount: number;
  phoneNumber: string;
  provider: string; // e.g. "mtn", "airtel", "flutterwave"
  status: "pending" | "successful" | "failed";
  transactionId?: string;
  providerReference?: string;
  providerStatus?: string;
  providerMessage?: string;
  submittedReference?: string;
  submittedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewNote?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    buyer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    phoneNumber: { type: String, required: true },
    provider: { type: String, default: "mobile_money" },
    status: {
      type: String,
      enum: ["pending", "successful", "failed"],
      default: "pending",
    },
    transactionId: { type: String },
    providerReference: { type: String, trim: true },
    providerStatus: { type: String },
    providerMessage: { type: String, maxlength: 500 },
    submittedReference: { type: String, trim: true, maxlength: 200 },
    submittedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNote: { type: String, trim: true, maxlength: 500 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

PaymentSchema.index({ transactionId: 1 }, { unique: true, sparse: true });
PaymentSchema.index({ providerReference: 1 }, { unique: true, sparse: true });

export default mongoose.model<IPayment>("Payment", PaymentSchema);
