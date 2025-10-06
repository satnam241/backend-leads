import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// emailService.ts
export const sendEmail = async (to: string, subject: string, text: string) => {
  try {
    await transporter.sendMail({ from: `"Lead System" <${process.env.EMAIL_USER}>`, to, subject, text });
    console.log(`📧 Email sent to: ${to}`); // ✅ log
    return true;
  } catch (err) {
    console.error("Email error:", err); // ✅ error log
    throw err;
  }
};