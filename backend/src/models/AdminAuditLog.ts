import mongoose, { Schema, Document } from "mongoose";

export type AdminAuditAction =
  | "user_suspended"
  | "user_reactivated"
  | "product_removed"
  | "product_restored"
  | "payout_approved"
  | "payout_rejected"
  | "payout_released"
  | "payment_approved"
  | "payment_rejected";

export interface IAdminAuditLog extends Document {
  admin: mongoose.Types.ObjectId;
  action: AdminAuditAction;
  targetUser?: mongoose.Types.ObjectId;
  targetProduct?: mongoose.Types.ObjectId;
  targetPayout?: mongoose.Types.ObjectId;
  targetPayment?: mongoose.Types.ObjectId;
  targetName: string;
  reason: string;
  createdAt: Date;
}

const AdminAuditLogSchema = new Schema<IAdminAuditLog>(
  {
    admin: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: {
      type: String,
      enum: [
        "user_suspended", "user_reactivated", "product_removed", "product_restored",
        "payout_approved", "payout_rejected", "payout_released",
        "payment_approved", "payment_rejected",
      ],
      required: true,
    },
    targetUser: { type: Schema.Types.ObjectId, ref: "User" },
    targetProduct: { type: Schema.Types.ObjectId, ref: "Product" },
    targetPayout: { type: Schema.Types.ObjectId, ref: "Payout" },
    targetPayment: { type: Schema.Types.ObjectId, ref: "Payment" },
    targetName: { type: String, required: true },
    reason: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<IAdminAuditLog>("AdminAuditLog", AdminAuditLogSchema);
