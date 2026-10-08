import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "buyer" | "seller" | "admin";
  isVerified: boolean;
  isSuspended: boolean;
  suspensionReason?: string;
  businessName?: string;
  businessDescription?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessAddress?: string;
  businessDocuments?: string[]; // paths to uploaded files
  verificationStatus: "pending" | "approved" | "rejected";
  verificationNote?: string;
  payoutRequestVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["buyer", "seller", "admin"],
      default: "buyer",
    },
    isVerified: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },
    suspensionReason: { type: String },
    businessName: { type: String },
    businessDescription: { type: String },
    businessEmail: { type: String },
    businessPhone: { type: String },
    businessAddress: { type: String },
    businessDocuments: [{ type: String }],
    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    verificationNote: { type: String },
    payoutRequestVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);
