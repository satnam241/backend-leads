// services/emailService.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
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
