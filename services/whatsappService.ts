// services/whatsappService.ts
import Twilio from "twilio";
import axios from "axios";

const useMeta = process.env.WHATSAPP_CLOUD_API === "true";

let twilioClient: Twilio.Twilio | null = null;

// Initialize Twilio only if NOT using Meta
if (!useMeta) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  twilioClient = Twilio(accountSid, authToken);
}

/**
 * Unified WhatsApp Sender
 * Supports:
 * - Twilio Text / Media / Template
 * - Meta Cloud API Text / Media
 */
export const sendWhatsAppUnified = async (
  toPhone: string,
  text?: string,
  mediaUrl?: string
) => {
  try {
    // normalize
    let norm = toPhone.replace(/\D/g, "");
    if (!norm.startsWith("91")) norm = "91" + norm;
    const toWhats = `whatsapp:+${norm}`;

    // ------------------------------------
    // 🟢 Twilio Route
    // ------------------------------------
    if (!useMeta && twilioClient) {
      console.log("📤 Sending WhatsApp via Twilio →", toWhats);

      const msg: any = {
        from: process.env.TWILIO_WHATSAPP_FROM!,
        to: toWhats,
        body: text || "",
      };

      if (mediaUrl) {
        msg.mediaUrl = [mediaUrl];
      }

      const res = await twilioClient.messages.create(msg);
      console.log("✅ Twilio WhatsApp Sent:", res.sid);
      return res;
    }

    // ------------------------------------
    // 🟣 Meta Cloud API Route
    // ------------------------------------
    console.log("📤 Sending WhatsApp via Meta →", norm);

    const url = process.env.WHATSAPP_API_URL!;
    const token = process.env.WHATSAPP_TOKEN!;

    if (mediaUrl) {
      const body = {
        messaging_product: "whatsapp",
        to: norm,
        type: "image",
        image: { link: mediaUrl, caption: text || "" },
      };
      const r = await axios.post(url, body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      return r.data;
    } else {
      const body = {
        messaging_product: "whatsapp",
        to: norm,
        type: "text",
        text: { body: text || "" },
      };
      const r = await axios.post(url, body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      return r.data;
    }
  } catch (err: any) {
    console.error("❌ WhatsApp Error:", err.response?.data || err.message || err);
    return false;
  }
};
