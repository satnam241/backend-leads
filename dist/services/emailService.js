"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const transporter = nodemailer_1.default.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
// emailService.ts
const sendEmail = async (to, subject, text) => {
    try {
        await transporter.sendMail({ from: `"Lead System" <${process.env.EMAIL_USER}>`, to, subject, text });
        console.log(`📧 Email sent to: ${to}`); // ✅ log
        return true;
    }
    catch (err) {
        console.error("Email error:", err); // ✅ error log
        throw err;
    }
};
exports.sendEmail = sendEmail;
//# sourceMappingURL=emailService.js.map