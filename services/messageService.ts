// services/messageService.ts
import path from "path";
import Lead from "../models/lead.model";
import { sendEmail } from "./emailService";
import { sendWhatsAppUnified } from "./whatsappService";
import FollowUpLog from "../models/followupLog.model";

export const sendMessageService = async (
  leadId: string,
  // messageType param is ignored here because user wants both auto; keep for compatibility
  messageType: "email" | "whatsapp" | "both" = "both",
  message?: string,
  adminEmail?: string
) => {
  const lead = await Lead.findById(leadId);
  if (!lead) throw new Error("Lead not found");

  const sentTo: any = {};

  const defaultTemplates = {
    email: `
Hi ${lead.fullName || "there"},

Thank you for contacting us! Please find attached our brochure with full details.

Our sales team will connect with you soon.

Regards,
Sales Team
    `,
    whatsapp: `Hi ${lead.fullName || "there"}! 👋 Thanks for reaching out. I'm sharing our brochure — please check. We'll contact you soon.`,
  };

  const finalMessage = message || defaultTemplates.email;
  const finalWhats = message || defaultTemplates.whatsapp;

  // attachment path (ensure brochure exists)
  const brochurePath = path.join(process.cwd(), "public", "brochure.pdf");
  const brochureUrl = `${process.env.BACKEND_URL?.replace(/\/+$/, "") || ""}/public/brochure.pdf`;

  // === Send Email (with brochure) ===
  try {
    const emailTo = lead.email || adminEmail;
    if (emailTo) {
      await sendEmail(
        emailTo,
        "Your Brochure — Thank you for contacting us",
        finalMessage.trim(),
        [
          {
            filename: "Brochure.pdf",
            path: brochurePath,
            contentType: "application/pdf",
          },
        ]
      );      
      sentTo.email = emailTo;
      console.log(`📧 Brochure email sent to ${emailTo}`);
    } else {
      console.log("⚠️ No email available to send brochure.");
    }
  } catch (err) {
    console.error("❌ Error sending brochure email:", err);
  }

  // === Send WhatsApp (text + brochure link/media) ===
  try {
    if (lead.phone) {
      // First send text (caption)
      await sendWhatsAppUnified(lead.phone, finalWhats.trim());
      sentTo.whatsappText = lead.phone;
      console.log(`📱 WhatsApp text sent to ${lead.phone}`);

      // Then send media (document link / image)
      // Twilio supports mediaUrl; Meta Cloud example uses image/document type with link
      if (process.env.WHATSAPP_CLOUD_API === "true") {
        // Meta: we will send brochure as document or image link via sendWhatsAppUnified (it handles meta)
        await sendWhatsAppUnified(lead.phone, "Please find the brochure here:", brochureUrl);
        sentTo.whatsappMedia = lead.phone;
        console.log(`📎 WhatsApp brochure link sent to ${lead.phone}`);
      } else {
        // For Twilio, mediaUrl must point to a public HTTPS resource
        // Ensure BACKEND_URL is set and public with /public/brochure.pdf static route
        if (process.env.BACKEND_URL) {
          await sendWhatsAppUnified(lead.phone, "Please find the brochure here:", brochureUrl);
          sentTo.whatsappMedia = lead.phone;
          console.log(`📎 WhatsApp brochure link sent to ${lead.phone} (Twilio)`);
        } else {
          console.warn("⚠️ BACKEND_URL not set — cannot send public brochure link via WhatsApp.");
        }
      }
    } else {
      console.log("⚠️ No phone found for lead — skipping WhatsApp.");
    }
  } catch (err) {
    console.error("❌ Error sending WhatsApp:", err);
  }

  // update lead lastReminderSent
  try {
    lead.lastReminderSent = new Date();
    await lead.save();
  } catch (e) {
    console.warn("⚠️ Could not update lead lastReminderSent:", e);
  }
  // ==============================
// 📝 SAVE FOLLOW-UP LOG
// ==============================
try {
  await FollowUpLog.create({
    leadId,
    message: message || finalMessage.trim(),
    type: messageType,
    status: "sent",
  });
} catch (logErr) {
  console.error("❌ Failed to log follow-up:", logErr);
}

await FollowUpLog.create({
  leadId,
  message: message || finalMessage.trim(),
  type: messageType,
  status: "failed"
});


  return { success: true, sentTo };
};
