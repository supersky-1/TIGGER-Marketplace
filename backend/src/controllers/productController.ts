import { Response } from "express";
import Product from "../models/Product";
import User from "../models/User";
import { AuthRequest } from "../middleware/auth";

export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, price, stock } = req.body;

    if (typeof name !== "string" || !name.trim() || typeof description !== "string" || !description.trim()) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    if ((typeof price !== "number" && typeof price !== "string") || String(price).trim() === "") {
      return res.status(400).json({ message: "Price must be a non-negative number" });
    }
    const parsedPrice = Number(price);
    const parsedStock = stock === undefined || stock === "" ? 0 : Number(stock);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ message: "Price must be a non-negative number" });
    }
    if (!Number.isSafeInteger(parsedStock) || parsedStock < 0) {
      return res.status(400).json({ message: "Stock must be a non-negative whole number" });
    }

    // Get the uploaded image filename (if any)
    const image = req.file ? `/uploads/${req.file.filename}` : undefined;

    const product = await Product.create({
      name: name.trim(),
      description: description.trim(),
      price: parsedPrice,
      stock: parsedStock,
      image,
      seller: req.user?.userId,
    });

    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getMyProducts = async (req: AuthRequest, res: Response) => {
  try {
    const products = await Product.find({
      seller: req.user?.userId,
      isActive: { $ne: false },
    }).sort({
      createdAt: -1,
    });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllProducts = async (req: AuthRequest, res: Response) => {
  try {
    const activeSellers = await User.find({ isSuspended: { $ne: true } }).distinct("_id");
    const products = await Product.find({
      isActive: { $ne: false },
      seller: { $in: activeSellers },
    })
      .populate("seller", "name")
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateMyProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { description, price, stock } = req.body;
    const updates: { description?: string; price?: number; stock?: number } = {};

    if (description !== undefined) {
      if (typeof description !== "string" || !description.trim()) {
        return res.status(400).json({ message: "Description cannot be empty" });
      }
      updates.description = description.trim();
    }

    if (price !== undefined) {
      const parsedPrice = Number(price);
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ message: "Price must be a non-negative number" });
      }
      updates.price = parsedPrice;
    }

    if (stock !== undefined) {
      const parsedStock = Number(stock);
      if (!Number.isInteger(parsedStock) || parsedStock < 0) {
        return res.status(400).json({ message: "Stock must be a non-negative whole number" });
      }
      updates.stock = parsedStock;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "Provide a description, price, or stock to update" });
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.productId, seller: req.user?.userId, isActive: { $ne: false } },
      { $set: updates },
      { returnDocument: "after", runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const removeMyProduct = async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.productId, seller: req.user?.userId, isActive: { $ne: false } },
      { $set: { isActive: false } },
      { returnDocument: "after" }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product removed from the marketplace" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
