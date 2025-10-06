// whatsappService.ts
import Twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

// Twilio client create
const client = Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export const sendWhatsApp = async (to: string, message: string) => {
  try {
    if (!to.startsWith("whatsapp:")) to = "whatsapp:" + to;

    const res = await client.messages.create({
      from: process.env.TWILIO_PHONE, 
      to,
      body: message,
    });

    console.log("📱 WhatsApp sent:", res.sid);
    return true;
  } catch (err) {
    console.error("WhatsApp error:", err);
    throw err;
  }
};
