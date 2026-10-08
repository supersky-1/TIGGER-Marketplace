import { Router } from "express";
import { paystackWebhook } from "../controllers/paystackController";

const router = Router();
router.post("/webhook", paystackWebhook);

export default router;
