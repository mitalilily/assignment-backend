const nodemailer = require("nodemailer");

const requiredMailSettings = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "MAIL_FROM"];
const placeholderValues = ["your_email@gmail.com", "your_app_password"];

const hasMailConfiguration = () => {
  return requiredMailSettings.every((key) => Boolean(process.env[key]));
};

const hasPlaceholderMailConfiguration = () => {
  return placeholderValues.includes(process.env.SMTP_USER) || placeholderValues.includes(process.env.SMTP_PASS);
};

const createTransporter = () => {
  const port = Number(process.env.SMTP_PORT);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    family: 4,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    tls: {
      servername: process.env.SMTP_HOST,
    },
  });
};

const sendOtpEmail = async ({ email, code, purpose }) => {
  if (!hasMailConfiguration() || hasPlaceholderMailConfiguration()) {
    throw new Error("Email OTP is not configured. Add real SMTP credentials in server environment variables.");
  }

  const transporter = createTransporter();
  const actionText = purpose === "signup" ? "create your account" : "sign in";

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: `Your IronManCourier OTP for ${actionText}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;max-width:560px;margin:0 auto;">
          <h2 style="margin-bottom:12px;">IronManCourier Verification</h2>
          <p>Use the OTP below to ${actionText}.</p>
          <div style="margin:24px 0;padding:18px 22px;border-radius:12px;background:#111827;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:6px;text-align:center;">
            ${code}
          </div>
          <p>This OTP expires in 5 minutes.</p>
          <p>If you did not request this code, you can ignore this email.</p>
        </div>
      `,
    });
  } catch (error) {
    throw new Error(error.message || "Unable to send OTP email right now.");
  }
};

module.exports = {
  hasMailConfiguration,
  sendOtpEmail,
};
