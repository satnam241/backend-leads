// services/whatsappService.ts
import Twilio from "twilio";
import axios from "axios";

const useMeta = process.env.WHATSAPP_CLOUD_API === "true";

let twilioClient: Twilio.Twilio | null = null;
if (!useMeta) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  twilioClient = Twilio(accountSid, authToken);
}

/**
 * sendWhatsAppUnified:
 * - If mediaUrl provided, sends media (via Twilio or Meta).
 * - If only text provided, sends text.
 *
 * toPhone: number (can be local without +) — function normalizes with +91 fallback.
 */
export const sendWhatsAppUnified = async (
  toPhone: string,
  text?: string,
  mediaUrl?: string
) => {
  // normalize phone, naive: if missing + assume +91 — adjust if you need global support
  let norm = toPhone.replace(/\D/g, "");
  if (!norm.startsWith("91") && !norm.startsWith("1") && !toPhone.startsWith("+")) {
    // assume India +91 (change if needed)
    norm = "91" + norm;
  }

  const toWhats = `whatsapp:+${norm}`;

  if (!useMeta && twilioClient) {
    // Twilio: can send text or media (mediaUrl array)
    const msg: any = { from: process.env.TWILIO_WHATSAPP_FROM!, to: toWhats };
    if (mediaUrl) {
      msg.body = text || ""; // include optional caption
      msg.mediaUrl = [mediaUrl];
    } else {
      msg.body = text || "";
    }

    const res = await twilioClient.messages.create(msg);
    return res;
  } else {
    // Meta Cloud API (must have phone number ID in URL)
    const url = process.env.WHATSAPP_API_URL!; // e.g. https://graph.facebook.com/v16.0/<PHONE_NUMBER_ID>/messages
    const token = process.env.WHATSAPP_TOKEN!;
    if (mediaUrl) {
      // send media message with caption
      const body = {
        messaging_product: "whatsapp",
        to: norm, // meta expects without plus
        type: "image", // you can use "document" too if supported
        image: { link: mediaUrl, caption: text || "" },
      };
      const r = await axios.post(url, body, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      return r.data;
    } else {
      // text only
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
  }
};
