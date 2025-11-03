"use strict";
// import express, { Request, Response } from "express";
// import Lead from "../models/lead.model";
// import { sendMessageService } from "../services/messageService";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// const router = express.Router();
// router.post("/", async (req: Request, res: Response) => {
//   try {
//     const { From, Body } = req.body;
//     if (!From) {
//       console.error("❌ Invalid webhook payload:", req.body);
//       return res.status(400).send("Invalid webhook payload");
//     }
//     const phone = From.replace("whatsapp:", "");
//     // Lead find or create
//     let lead = await Lead.findOne({ phone });
//     if (!lead) {
//       lead = await Lead.create({
//         fullName: Body || "WhatsApp User",
//         email: null,
//         phone,
//         phoneVerified: false, // default
//         whenAreYouPlanningToPurchase: null,
//         whatIsYourBudget: null,
//         source: "whatsapp",
//         rawData: req.body,
//       });
//       console.log(`✅ New WhatsApp lead created: ${phone}`);
//     } else {
//       console.log(`ℹ️ Existing lead found: ${phone}`);
//     }
//     // ✅ Use messageService to send WhatsApp + Email
//     try {
//       await sendMessageService(lead._id.toString(), "both");
//       console.log("📲 WhatsApp + Email auto-reply sent");
//     } catch (err) {
//       console.error("❌ sendMessageService error:", err);
//     }
//     // Twilio expects XML response
//     res.set("Content-Type", "text/xml");
//     res.send("<Response></Response>");
//   } catch (err) {
//     console.error("❌ Twilio webhook error:", err);
//     res.status(500).send("Webhook error");
//   }
// });
// export default router;
// routes/whatsappWebhook.ts
const express_1 = __importDefault(require("express"));
const lead_model_1 = __importDefault(require("../models/lead.model"));
const phone_1 = require("../services/phone");
const messageService_1 = require("../services/messageService");
const router = express_1.default.Router();
router.post("/", async (req, res) => {
    try {
        const { From, Body } = req.body;
        if (!From) {
            console.error("❌ Invalid webhook payload:", req.body);
            return res.status(400).send("Invalid webhook payload");
        }
        const phoneRaw = From.replace(/^whatsapp:/i, "");
        const phone = (0, phone_1.normalizePhone)(phoneRaw);
        let lead = await lead_model_1.default.findOne({ phone });
        if (!lead) {
            lead = await lead_model_1.default.create({
                fullName: Body || "WhatsApp User",
                email: null,
                phone,
                phoneVerified: false,
                source: "whatsapp",
                rawData: req.body,
            });
            console.log(`✅ New WhatsApp lead created: ${phone}`);
        }
        else {
            console.log(`ℹ️ Existing lead found: ${phone}`);
        }
        try {
            // ensure sendMessageService gets string id
            await (0, messageService_1.sendMessageService)(String(lead._id), "both");
            console.log("📲 WhatsApp + Email auto-reply sent");
        }
        catch (err) {
            console.error("❌ sendMessageService error:", err);
        }
        // Twilio expects XML response
        res.set("Content-Type", "text/xml");
        res.send("<Response></Response>");
    }
    catch (err) {
        console.error("❌ Twilio webhook error:", err);
        res.status(500).send("Webhook error");
    }
});
exports.default = router;
//# sourceMappingURL=whatsappWebhook.js.map