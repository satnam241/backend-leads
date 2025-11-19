"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWhatsApp = exports.sendWhatsAppUnified = void 0;
// services/whatsappService.ts
const twilio_1 = __importDefault(require("twilio"));
const axios_1 = __importDefault(require("axios"));
const useMeta = process.env.WHATSAPP_CLOUD_API === "true";
let twilioClient = null;
if (!useMeta) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    twilioClient = (0, twilio_1.default)(accountSid, authToken);
}
/**
 * sendWhatsAppUnified:
 * - If mediaUrl provided, sends media (via Twilio or Meta).
 * - If only text provided, sends text.
 *
 * toPhone: number (can be local without +) — function normalizes with +91 fallback.
 */
const sendWhatsAppUnified = async (toPhone, text, mediaUrl) => {
    // normalize phone, naive: if missing + assume +91 — adjust if you need global support
    let norm = toPhone.replace(/\D/g, "");
    if (!norm.startsWith("91") && !norm.startsWith("1") && !toPhone.startsWith("+")) {
        // assume India +91 (change if needed)
        norm = "91" + norm;
    }
    const toWhats = `whatsapp:+${norm}`;
    if (!useMeta && twilioClient) {
        // Twilio: can send text or media (mediaUrl array)
        const msg = { from: process.env.TWILIO_WHATSAPP_FROM, to: toWhats };
        if (mediaUrl) {
            msg.body = text || ""; // include optional caption
            msg.mediaUrl = [mediaUrl];
        }
        else {
            msg.body = text || "";
        }
        const res = await twilioClient.messages.create(msg);
        return res;
    }
    else {
        // Meta Cloud API (must have phone number ID in URL)
        const url = process.env.WHATSAPP_API_URL; // e.g. https://graph.facebook.com/v16.0/<PHONE_NUMBER_ID>/messages
        const token = process.env.WHATSAPP_TOKEN;
        if (mediaUrl) {
            // send media message with caption
            const body = {
                messaging_product: "whatsapp",
                to: norm, // meta expects without plus
                type: "image", // you can use "document" too if supported
                image: { link: mediaUrl, caption: text || "" },
            };
            const r = await axios_1.default.post(url, body, {
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            });
            return r.data;
        }
        else {
            // text only
            const body = {
                messaging_product: "whatsapp",
                to: norm,
                type: "text",
                text: { body: text || "" },
            };
            const r = await axios_1.default.post(url, body, {
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            });
            return r.data;
        }
    }
};
exports.sendWhatsAppUnified = sendWhatsAppUnified;
const sendWhatsApp = async (to, message) => {
    try {
        // TODO: replace with real provider logic (Twilio / Meta / etc.)
        console.log("[whatsappService] sendWhatsApp ->", to, message);
        // pretend success
        return true;
    }
    catch (err) {
        console.error("[whatsappService] sendWhatsApp error:", err);
        return false;
    }
};
exports.sendWhatsApp = sendWhatsApp;
//# sourceMappingURL=whatsappService.js.map