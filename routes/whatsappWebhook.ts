// routes/whatsappWebhook.ts
import express, { Request, Response } from "express";
import Lead from "../models/lead.model";
import { normalizePhone } from "../services/phone";
import { sendMessageService } from "../services/messageService";

const router = express.Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { From, Body } = req.body;

    if (!From) {
      console.error("❌ Invalid webhook payload:", req.body);
      return res.status(400).send("Invalid webhook payload");
    }

    const phoneRaw = From.replace(/^whatsapp:/i, "");
    const phone = normalizePhone(phoneRaw);

    // 🔍 Find or create lead
    let lead = await Lead.findOne({ phone });

    if (!lead) {
      lead = await Lead.create({
        fullName: Body || "WhatsApp User",
        email: null,
        phone,
        phoneVerified: false,
        source: "whatsapp",
        rawData: req.body,
      });
      console.log(`✅ New WhatsApp lead created: ${phone}`);
    } else {
      console.log(`ℹ️ Existing lead found: ${phone}`);
    }

    // 📤 Auto-response (WhatsApp + Email)
    try {
      await sendMessageService(String(lead._id), "both");
      console.log("📲 WhatsApp + Email auto-reply sent");
    } catch (err) {
      console.error("❌ sendMessageService error:", err);
    }

    // Twilio requires XML
    res.set("Content-Type", "text/xml");
    res.send("<Response></Response>");
  } catch (err) {
    console.error("❌ Twilio webhook error:", err);
    res.status(500).send("Webhook error");
  }
});

export default router;
