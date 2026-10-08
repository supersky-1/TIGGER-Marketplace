import { Response } from "express";
import Notification from "../models/Notification";
import { AuthRequest } from "../middleware/auth";

export const getMyNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await Notification.find({ user: req.user?.userId })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({
      user: req.user?.userId,
      isRead: false,
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await Notification.findOneAndUpdate(
      { _id: id, user: req.user?.userId },
      { isRead: true }
    );

    res.json({ message: "Marked as read" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    await Notification.updateMany(
      { user: req.user?.userId, isRead: false },
      { isRead: true }
    );

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Helper function we can call from other controllers
export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: "order" | "message" | "payout" | "verification" | "system" = "system",
  link?: string
) => {
  try {
    await Notification.create({
      user: userId,
      title,
      message,
      type,
      link,
    });
  } catch (error) {
    console.error("Failed to create notification", error);
  }
};