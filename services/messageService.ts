// services/messageService.ts
import Lead from "../models/lead.model";
import { sendEmail } from "./emailService";
import { sendWhatsApp } from "./whatsappService";

export const sendMessageService = async (
  leadId: string,
  messageType: "email" | "whatsapp" | "both",
  message?: string,
  adminEmail?: string
) => {
  const lead = await Lead.findById(leadId);
  if (!lead) throw new Error("Lead not found");

  const sentTo: any = {};

  // ✅ Default professional messages
  const defaultMessages = {
    email: `Hi ${lead.fullName || "there"},\n\nThank you for reaching out to us. Our sales team will contact you shortly.\n\nBest regards,\nSales Team`,
    whatsapp: `Hi ${lead.fullName || "there"}! 👋 Thanks for reaching out. Our team will contact you soon.`,
  };

  const finalMessage =
    message ||
    (messageType === "whatsapp" ? defaultMessages.whatsapp : defaultMessages.email);

  // ✅ Send Email
  if ((messageType === "email" || messageType === "both") && (lead.email || adminEmail)) {
    try {
      const emailToSend = lead.email || adminEmail;
      if (emailToSend) {
        await sendEmail(emailToSend, "Follow-up from Sales Team", finalMessage);
      } else {
        console.log("⚠️ No email found to send follow-up message.");
      }
      
      sentTo.email = emailToSend;
      console.log(`📧 Email sent to: ${emailToSend}`);
    } catch (err) {
      console.error("❌ Email send error:", err);
    }
  }

  // ✅ Send WhatsApp
  if ((messageType === "whatsapp" || messageType === "both") && lead.phone) {
    try {
      await sendWhatsApp(lead.phone, finalMessage);
      sentTo.whatsapp = lead.phone;
      console.log(`📱 WhatsApp sent to: ${lead.phone}`);
    } catch (err) {
      console.error("❌ WhatsApp send error:", err);
    }
  }

  // AI removed
  return { sentTo };
};
