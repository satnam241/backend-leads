// services/emailService.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,          // MUST USE THIS ON RENDER
  secure: false,      // Only port 587 allowed
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  }
});


export const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  attachments?: { filename: string; path?: string; contentType?: string }[]
) => {
  const mailOptions: any = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  };

  if (attachments && attachments.length) mailOptions.attachments = attachments;

  return transporter.sendMail(mailOptions);
};
