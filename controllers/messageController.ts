// controllers/messageController.ts
import { Request, Response } from "express";
import Lead from "../models/lead.model";
import { sendEmail } from "../services/emailService";
import { sendWhatsApp } from "../services/whatsappService";

export const sendMessageController = async (req: Request, res: Response) => {
  const { leadId } = req.params;
  const { messageType, message, adminEmail } = req.body;
  const sentTo: any = {};

  try {
    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    // Default professional message content
    const defaultMessage = `
Hi ${lead.fullName || "there"}, 👋

Thank you for reaching out to us.  
Our sales team has received your request and will get in touch with you shortly.  

Meanwhile, if you have any urgent queries, feel free to reply to this message.  
We look forward to assisting you! 🚀

Best Regards,  
Your Sales Team
    `;

    const finalMessage = message || defaultMessage;

    // Email
    if ((messageType === "email" || messageType === "both") && (lead.email || adminEmail)) {
      try {
        const emailToSend = lead.email || adminEmail;
        await sendEmail(emailToSend, "Thank you for contacting us!", finalMessage);
        sentTo.email = emailToSend;
      } catch (err) {
        console.error("Email send error:", err);
      }
    }

    // WhatsApp
    if ((messageType === "whatsapp" || messageType === "both") && lead.phone) {
      try {
        await sendWhatsApp(lead.phone, finalMessage);
        sentTo.whatsapp = lead.phone;
      } catch (err) {
        console.error("WhatsApp error:", err);
      }
    }

    res.json({ success: true, sentTo, reply: finalMessage });
  } catch (err) {
    console.error("Controller error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
