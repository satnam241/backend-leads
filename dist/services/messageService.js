"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessageService = void 0;
// services/messageService.ts
const lead_model_1 = __importDefault(require("../models/lead.model"));
const emailService_1 = require("./emailService");
const whatsappService_1 = require("./whatsappService");
const sendMessageService = async (leadId, messageType, message, adminEmail) => {
    const lead = await lead_model_1.default.findById(leadId);
    if (!lead)
        throw new Error("Lead not found");
    const sentTo = {};
    // ✅ Default professional messages
    const defaultMessages = {
        email: `Hi ${lead.fullName || "there"},\n\nThank you for reaching out to us. Our sales team will contact you shortly.\n\nBest regards,\nSales Team`,
        whatsapp: `Hi ${lead.fullName || "there"}! 👋 Thanks for reaching out. Our team will contact you soon.`,
    };
    const finalMessage = message ||
        (messageType === "whatsapp" ? defaultMessages.whatsapp : defaultMessages.email);
    // ✅ Send Email
    if ((messageType === "email" || messageType === "both") && (lead.email || adminEmail)) {
        try {
            const emailToSend = lead.email || adminEmail;
            if (emailToSend) {
                await (0, emailService_1.sendEmail)(emailToSend, "Follow-up from Sales Team", finalMessage);
            }
            else {
                console.log("⚠️ No email found to send follow-up message.");
            }
            sentTo.email = emailToSend;
            console.log(`📧 Email sent to: ${emailToSend}`);
        }
        catch (err) {
            console.error("❌ Email send error:", err);
        }
    }
    // ✅ Send WhatsApp
    if ((messageType === "whatsapp" || messageType === "both") && lead.phone) {
        try {
            await (0, whatsappService_1.sendWhatsApp)(lead.phone, finalMessage);
            sentTo.whatsapp = lead.phone;
            console.log(`📱 WhatsApp sent to: ${lead.phone}`);
        }
        catch (err) {
            console.error("❌ WhatsApp send error:", err);
        }
    }
    // AI removed
    return { sentTo };
};
exports.sendMessageService = sendMessageService;
//# sourceMappingURL=messageService.js.map