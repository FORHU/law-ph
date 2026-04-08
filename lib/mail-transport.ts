import nodemailer from 'nodemailer';

// Gmail SMTP configuration
const smtpUser = process.env.SMTP_USER || '';
const smtpPass = process.env.SMTP_PASS || '';
const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;

if ((!smtpUser || !smtpPass) && process.env.NODE_ENV === 'production') {
  console.warn('SMTP_USER or SMTP_PASS is not defined in environment variables.');
}

export const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  auth: {
    user: smtpUser,
    pass: smtpPass
  }
});

export const defaultFrom = process.env.SMTP_FROM || smtpUser || 'updates@ilovelawyer.com';
