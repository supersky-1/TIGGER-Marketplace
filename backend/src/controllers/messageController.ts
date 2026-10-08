import { Response } from "express";
import Message from "../models/Message";
import Product from "../models/Product";
import User from "../models/User";
import { AuthRequest } from "../middleware/auth";

const canContact = async (senderId: string, receiverId: string) => {
  const [sender, receiver, existingMessage] = await Promise.all([
    User.findById(senderId).select("role isSuspended"),
    User.findById(receiverId).select("role isSuspended"),
    Message.exists({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId },
      ],
    }),
  ]);
  if (!sender || !receiver || sender.isSuspended || receiver.isSuspended) return false;
  if (existingMessage) return true;
  return sender.role === "buyer" && receiver.role === "seller" && Boolean(
    await Product.exists({ seller: receiverId, isActive: { $ne: false } })
  );
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { receiverId, content } = req.body;

    if (typeof receiverId !== "string" || !/^[a-f\d]{24}$/i.test(receiverId)) {
      return res.status(400).json({ message: "A valid receiver is required" });
    }
    if (receiverId === req.user?.userId) {
      return res.status(400).json({ message: "You cannot message yourself" });
    }
    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ message: "Message content is required" });
    }
    if (content.trim().length > 2000) {
      return res.status(400).json({ message: "Messages must be 2,000 characters or fewer" });
    }
    if (!await canContact(req.user!.userId, receiverId)) {
      return res.status(403).json({ message: "You can message a seller about their listings; sellers can reply to existing conversations." });
    }

    const message = await Message.create({
      sender: req.user?.userId,
      receiver: receiverId,
      content: content.trim(),
    });

    const populated = await Message.findById(message._id)
      .populate("sender", "name")
      .populate("receiver", "name");

    res.status(201).json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getConversation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId;

    if (typeof userId !== "string" || !/^[a-f\d]{24}$/i.test(userId) || userId === req.user?.userId) {
      return res.status(400).json({ message: "A valid conversation user is required" });
    }
    if (!await canContact(req.user!.userId, userId)) {
      return res.status(403).json({ message: "You do not have access to this conversation" });
    }

    const messages = await Message.find({
      $or: [
        { sender: req.user?.userId, receiver: userId },
        { sender: userId, receiver: req.user?.userId },
      ],
    })
      .populate("sender", "name")
      .populate("receiver", "name")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(messages.reverse());
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getMyConversations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    // Get all messages involving the current user
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .populate("sender", "name email")
      .populate("receiver", "name email")
      .sort({ createdAt: -1 })
      .limit(300);

    // Group by the other person
    const conversationsMap = new Map();

    messages.forEach((msg) => {
      const otherUser =
        msg.sender._id.toString() === userId
          ? msg.receiver
          : msg.sender;

      const otherId = otherUser._id.toString();

      if (!conversationsMap.has(otherId)) {
        conversationsMap.set(otherId, {
          user: otherUser,
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt,
        });
      }
    });

    const conversations = Array.from(conversationsMap.values());
    res.json(conversations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
