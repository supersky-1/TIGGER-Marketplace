import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";

import authRoutes from "./routes/authRoutes";
import productRoutes from "./routes/productRoutes";
import orderRoutes from "./routes/orderRoutes";
import adminRoutes from "./routes/adminRoutes";
import messageRoutes from "./routes/messageRoutes";
import payoutRoutes from "./routes/payoutRoutes";
import verificationRoutes from "./routes/verificationRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import { expirePendingPayments } from "./services/paymentExpiry";
import paystackRoutes from "./routes/paystackRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({
  verify: (req, _res, buffer) => {
    (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
  },
}));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/payouts", payoutRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/payments", paystackRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Marketplace API is running" });
});

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/marketplace";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    const runPaymentExpiry = () => {
      void expirePendingPayments().catch((error) => {
        console.error("Failed to expire pending payments:", error);
      });
    };
    runPaymentExpiry();
    const paymentExpiryTimer = setInterval(runPaymentExpiry, 60_000);
    paymentExpiryTimer.unref();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });
