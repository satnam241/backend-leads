"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessageController = void 0;
const lead_model_1 = __importDefault(require("../models/lead.model"));
const emailService_1 = require("../services/emailService");
const whatsappService_1 = require("../services/whatsappService");
const sendMessageController = async (req, res) => {
    const { leadId } = req.params;
    const { messageType, message, adminEmail } = req.body;
    const sentTo = {};
    try {
        const lead = await lead_model_1.default.findById(leadId);
        if (!lead)
            return res.status(404).json({ error: "Lead not found" });
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
                await (0, emailService_1.sendEmail)(emailToSend, "Thank you for contacting us!", finalMessage);
                sentTo.email = emailToSend;
            }
            catch (err) {
                console.error("Email send error:", err);
            }
        }
        // WhatsApp
        if ((messageType === "whatsapp" || messageType === "both") && lead.phone) {
            try {
                await (0, whatsappService_1.sendWhatsApp)(lead.phone, finalMessage);
                sentTo.whatsapp = lead.phone;
            }
            catch (err) {
                console.error("WhatsApp error:", err);
            }
        }
        res.json({ success: true, sentTo, reply: finalMessage });
    }
    catch (err) {
        console.error("Controller error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.sendMessageController = sendMessageController;
//# sourceMappingURL=messageController.js.map