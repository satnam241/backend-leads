// import express, { Request, Response } from "express";
// import Lead from "../models/lead.model";
// import { sendMessageService } from "../services/messageService";

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

    try {
      // ensure sendMessageService gets string id
      await sendMessageService(String((lead as any)._id), "both");

      console.log("📲 WhatsApp + Email auto-reply sent");
    } catch (err) {
      console.error("❌ sendMessageService error:", err);
    }

    // Twilio expects XML response
    res.set("Content-Type", "text/xml");
    res.send("<Response></Response>");
  } catch (err) {
    console.error("❌ Twilio webhook error:", err);
    res.status(500).send("Webhook error");
  }
});

export default router;
