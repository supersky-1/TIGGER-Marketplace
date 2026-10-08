import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { AuthRequest, getJwtSecret } from "../middleware/auth";

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, businessName } = req.body;
    const requestedRole = role ?? "buyer";

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }
    if (typeof password !== "string" || password.length < 8 || password.length > 128) {
      return res.status(400).json({ message: "Password must be between 8 and 128 characters" });
    }

    if (requestedRole !== "buyer" && requestedRole !== "seller") {
      return res.status(400).json({ message: "Role must be buyer or seller" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const userData: any = {
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: requestedRole,
    };

    // If registering as seller, set verification to pending
    if (requestedRole === "seller") {
      userData.businessName = businessName || name;
      userData.verificationStatus = "pending";
      userData.isVerified = false;
    } else {
      userData.isVerified = true; // buyers are auto-verified
      userData.verificationStatus = "approved";
    }

    const user = await User.create(userData);

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      getJwtSecret(),
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (user.isSuspended) {
      return res.status(403).json({ message: "This account has been suspended" });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      getJwtSecret(),
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.userId).select("-password");
    if (!user) return res.status(404).json({ message: "Profile not found" });
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateSellerProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "seller") {
      return res.status(403).json({ message: "Only sellers can edit their profile" });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "Profile not found" });

    const { name, email, businessName, businessDescription, businessEmail, businessPhone, businessAddress } = req.body;
    let changed = false;
    let businessIdentityChanged = false;

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "Name cannot be empty" });
      }
      user.name = name.trim();
      changed = true;
    }

    if (email !== undefined) {
      if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return res.status(400).json({ message: "Enter a valid email address" });
      }
      const normalizedEmail = email.trim().toLowerCase();
      const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
      if (existing) return res.status(409).json({ message: "Email is already in use" });
      user.email = normalizedEmail;
      changed = true;
    }

    if (businessName !== undefined) {
      if (typeof businessName !== "string" || !businessName.trim()) {
        return res.status(400).json({ message: "Business name cannot be empty" });
      }
      businessIdentityChanged = businessName.trim() !== user.businessName;
      user.businessName = businessName.trim();
      changed = true;
    }

    const optionalBusinessFields = [
      "businessDescription",
      "businessEmail",
      "businessPhone",
      "businessAddress",
    ] as const;
    for (const key of optionalBusinessFields) {
      const value = req.body[key];
      if (value === undefined) continue;
      if (typeof value !== "string") {
        return res.status(400).json({ message: "Business profile fields must be text" });
      }
      if (key === "businessEmail" && value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        return res.status(400).json({ message: "Enter a valid business email address" });
      }
      user.set(key, value.trim() || undefined);
      changed = true;
    }

    if (!changed) {
      return res.status(400).json({ message: "Provide at least one profile field to update" });
    }

    if (businessIdentityChanged && user.isVerified) {
      user.isVerified = false;
      user.verificationStatus = "pending";
      user.verificationNote = "Business name changed. Please resubmit verification documents.";
    }

    await user.save();
    const { password: _password, ...profile } = user.toObject();
    res.json(profile);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      return res.status(409).json({ message: "Email is already in use" });
    }
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
