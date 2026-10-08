import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET must be configured");
  }
  return secret;
};

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  const token = authHeader.split(" ")[1];

  let decoded: { userId: string };
  try {
    decoded = jwt.verify(token, getJwtSecret()) as {
      userId: string;
      role: string;
    };
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, token failed" });
  }

  const user = await User.findById(decoded.userId).select("role isSuspended");
  if (!user) {
    return res.status(401).json({ message: "Not authorized, account not found" });
  }
  if (user.isSuspended) {
    return res.status(403).json({ message: "This account has been suspended" });
  }

  req.user = { userId: user._id.toString(), role: user.role };
  next();
};

export const sellerOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === "seller") {
    next();
  } else {
    return res.status(403).json({ message: "Access denied. Sellers only." });
  }
};

export const verifiedSellerOnly = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== "seller") {
      return res.status(403).json({ message: "Access denied. Sellers only." });
    }
    const user = await User.findById(req.user.userId).select("isVerified verificationStatus");
    if (!user || !user.isVerified || user.verificationStatus !== "approved") {
      return res.status(403).json({ message: "Seller verification approval is required" });
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }
};
