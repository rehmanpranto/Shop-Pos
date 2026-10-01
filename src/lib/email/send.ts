import nodemailer from "nodemailer";

export async function sendInvoiceEmail(input: {
  to: string;
  subject: string;
  html: string;
  pdfBuffer: Buffer;
  fileName: string;
}) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM;

  if (!host || !user || !pass || !from) {
    throw new Error("SMTP is not configured");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    attachments: [
      {
        filename: input.fileName,
        content: input.pdfBuffer,
      },
    ],
  });
}
