import { Router } from "express";
import {
  sendMessage,
  getConversation,
  getMyConversations,
} from "../controllers/messageController";
import { protect } from "../middleware/auth";

const router = Router();

router.post("/", protect, sendMessage);
router.get("/conversations", protect, getMyConversations);
router.get("/conversation/:userId", protect, getConversation);

export default router;