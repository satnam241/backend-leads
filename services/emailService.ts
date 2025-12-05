// // services/emailService.ts
// import nodemailer from "nodemailer";

// const transporter = nodemailer.createTransport({
//   host: "smtp.gmail.com",
//   port: 587,          // MUST USE THIS ON RENDER
//   secure: false,      // Only port 587 allowed
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
//   tls: {
//     rejectUnauthorized: false,
//   }
// });


// export const sendEmail = async (
//   to: string,
//   subject: string,
//   text: string,
//   attachments?: { filename: string; path?: string; contentType?: string }[]
// ) => {
//   const mailOptions: any = {
//     from: process.env.EMAIL_USER,
//     to,
//     subject,
//     text,
//   };

//   if (attachments && attachments.length) mailOptions.attachments = attachments;

//   return transporter.sendMail(mailOptions);
// };

// services/emailService.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  attachments?: Array<{
    filename: string;
    path: string;
    contentType?: string;
  }>
) => {
  try {
    // Convert attachments to Resend’s required format
    const formattedAttachments =
      attachments?.map(att => ({
        filename: att.filename,
        path: att.path,
      })) || [];

    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to,
      subject,
      html,
      attachments: formattedAttachments, // Resend supports attachments!
    });

    console.log("📧 Email sent:", response);
    return response;
  } catch (error) {
    console.error("❌ Resend Email Error:", error);
    throw error;
  }
};
