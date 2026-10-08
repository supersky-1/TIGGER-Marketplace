import { Response } from "express";
import User from "../models/User";
import { AuthRequest } from "../middleware/auth";
import { createNotification } from "./notificationController";

export const submitVerification = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { businessName } = req.body;

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ message: "Please upload at least one document" });
    }

    const documentPaths = files.map((file) => `/uploads/${file.filename}`);

    const user = await User.findByIdAndUpdate(
      userId,
      {
        businessName: businessName || undefined,
        businessDocuments: documentPaths,
        verificationStatus: "pending",
        isVerified: false,
      },
      { returnDocument: "after" }
    ).select("-password");

    res.json({
      message: "Documents submitted successfully. Waiting for admin approval.",
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getPendingVerifications = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admins only" });
    }

    const pending = await User.find({
      role: "seller",
      verificationStatus: "pending",
    }).select("-password");

    res.json(pending);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateVerificationStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admins only" });
    }

    const { userId } = req.params;
    const targetUserId = Array.isArray(userId) ? userId[0] : userId;
    const { status, note } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const user = await User.findByIdAndUpdate(
      targetUserId,
      {
        verificationStatus: status,
        isVerified: status === "approved",
        verificationNote: note || "",
      },
      { returnDocument: "after" }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send notification to the seller
    await createNotification(
      targetUserId,
      status === "approved" ? "Verification Approved 🎉" : "Verification Rejected",
      status === "approved"
        ? "Congratulations! Your seller account has been verified. You can now start selling."
        : "Your seller verification was rejected. Please contact support or resubmit your documents.",
      "verification",
      status === "approved" ? "/seller/dashboard" : "/seller/verification"
    );

    res.json({
      message: `Seller verification ${status}`,
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
