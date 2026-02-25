import sgMail from "@sendgrid/mail";
import { env } from "../config/env.js";

if (env.SENDGRID_API_KEY) {
  sgMail.setApiKey(env.SENDGRID_API_KEY);
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<void> {
  if (!env.SENDGRID_API_KEY) {
    // Dev fallback: log to console instead of sending
    console.log(`\n📧 [DEV EMAIL] To: ${to}\nSubject: ${subject}\n${text ?? html}\n`);
    return;
  }

  await sgMail.send({
    to,
    from: { email: env.FROM_EMAIL, name: env.FROM_NAME },
    subject,
    html,
    text: text ?? subject,
  });
}

// ─── Email Templates ─────────────────────────────────────────────────────────

function baseTemplate(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { margin: 0; padding: 0; background: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .container { max-width: 520px; margin: 40px auto; background: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); }
    .header { background: linear-gradient(135deg, #22d3ee, #6366f1); padding: 32px 40px; text-align: center; }
    .header h1 { margin: 0; color: white; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; color: rgba(255,255,255,0.8); font-size: 13px; }
    .body { padding: 36px 40px; }
    .body p { color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0 0 16px; }
    .btn { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #22d3ee, #6366f1); color: white !important; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; margin: 8px 0 24px; }
    .code { display: block; text-align: center; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #22d3ee; font-family: monospace; padding: 20px; background: rgba(34,211,238,0.08); border-radius: 10px; margin: 16px 0 24px; border: 1px solid rgba(34,211,238,0.2); }
    .note { color: #64748b !important; font-size: 12px !important; }
    .footer { padding: 20px 40px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center; }
    .footer p { color: #475569; font-size: 12px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚡ SocialFi</h1>
      <p>${title}</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} SocialFi. All rights reserved.</p>
      <p style="margin-top:4px">If you didn't request this, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>`;
}

export function emailVerificationTemplate(username: string, verifyUrl: string): { subject: string; html: string; text: string } {
  return {
    subject: "Verify your SocialFi email address",
    html: baseTemplate("Email Verification", `
      <p>Hi <strong style="color:#e2e8f0">${username}</strong>,</p>
      <p>Welcome to SocialFi! Please verify your email address to unlock all features and start earning rewards.</p>
      <div style="text-align:center">
        <a href="${verifyUrl}" class="btn">✅ Verify Email Address</a>
      </div>
      <p class="note">This link expires in <strong>24 hours</strong>. If you didn't create a SocialFi account, please ignore this email.</p>
    `),
    text: `Welcome to SocialFi! Verify your email: ${verifyUrl}`,
  };
}

export function passwordResetTemplate(username: string, resetUrl: string): { subject: string; html: string; text: string } {
  return {
    subject: "Reset your SocialFi password",
    html: baseTemplate("Password Reset", `
      <p>Hi <strong style="color:#e2e8f0">${username}</strong>,</p>
      <p>We received a request to reset your password. Click the button below to choose a new password.</p>
      <div style="text-align:center">
        <a href="${resetUrl}" class="btn">🔑 Reset Password</a>
      </div>
      <p class="note">This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.</p>
    `),
    text: `Reset your SocialFi password: ${resetUrl}`,
  };
}

export function welcomeEmailTemplate(username: string, loginUrl: string): { subject: string; html: string; text: string } {
  return {
    subject: "Welcome to SocialFi — Start earning! 🚀",
    html: baseTemplate("Welcome aboard!", `
      <p>Hi <strong style="color:#e2e8f0">${username}</strong>,</p>
      <p>Your account is ready! Here's what you can do on SocialFi:</p>
      <ul style="color:#cbd5e1;font-size:14px;line-height:2;padding-left:20px">
        <li>📰 Post content and build your audience</li>
        <li>💰 Earn tokens by viewing sponsored posts</li>
        <li>🎯 Run ad campaigns to reach Web3 users</li>
        <li>🔗 Connect your MetaMask wallet for crypto rewards</li>
        <li>👥 Invite friends with your referral code for bonus earnings</li>
      </ul>
      <div style="text-align:center;margin-top:20px">
        <a href="${loginUrl}" class="btn">🚀 Start Exploring</a>
      </div>
    `),
    text: `Welcome to SocialFi, ${username}! Start exploring: ${loginUrl}`,
  };
}
