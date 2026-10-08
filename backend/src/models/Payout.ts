import mongoose, { Schema, Document } from "mongoose";

export interface IPayout extends Document {
  seller: mongoose.Types.ObjectId;
  amount: number;           // Amount seller will receive (after 12.5% fee)
  fee: number;              // Platform fee (12.5%)
  grossAmount: number;      // Total sales before fee
  status: "pending" | "processing" | "paid" | "rejected";
  adminNote?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  releasedBy?: mongoose.Types.ObjectId;
  releasedAt?: Date;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutSchema = new Schema<IPayout>(
  {
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    fee: { type: Number, required: true },
    grossAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "paid", "rejected"],
      default: "pending",
    },
    adminNote: { type: String },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    releasedBy: { type: Schema.Types.ObjectId, ref: "User" },
    releasedAt: { type: Date },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IPayout>("Payout", PayoutSchema);
