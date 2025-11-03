"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWhatsApp = void 0;
// whatsappService.ts
const twilio_1 = __importDefault(require("twilio"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Twilio client create
const client = (0, twilio_1.default)(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const sendWhatsApp = async (to, message) => {
    try {
        if (!to.startsWith("whatsapp:"))
            to = "whatsapp:" + to;
        const res = await client.messages.create({
            from: process.env.TWILIO_NUMBER,
            to,
            body: message,
        });
        console.log("📱 WhatsApp sent:", res.sid);
        return true;
    }
    catch (err) {
        console.error("WhatsApp error:", err);
        throw err;
    }
};
exports.sendWhatsApp = sendWhatsApp;
//# sourceMappingURL=whatsappService.js.map