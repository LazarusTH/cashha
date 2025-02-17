import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

export type SecurityEventType =
  | "NEW_LOGIN"
  | "FAILED_LOGIN"
  | "PASSWORD_CHANGED"
  | "SECURITY_QUESTIONS_UPDATED"
  | "DEVICE_REMOVED"
  | "ACCOUNT_RECOVERY_ATTEMPTED";

interface EmailData {
  to: string;
  subject: string;
  html: string;
}

const templates: Record<SecurityEventType, (data: any) => EmailData> = {
  NEW_LOGIN: (data) => ({
    to: data.email,
    subject: "New Login Detected",
    html: `
      <h2>New Login to Your Account</h2>
      <p>A new login was detected from:</p>
      <ul>
        <li>Device: ${data.device_name}</li>
        <li>Browser: ${data.browser}</li>
        <li>Location: ${data.location}</li>
        <li>IP Address: ${data.ip_address}</li>
        <li>Time: ${new Date(data.timestamp).toLocaleString()}</li>
      </ul>
      <p>If this wasn't you, please secure your account immediately.</p>
    `,
  }),
  FAILED_LOGIN: (data) => ({
    to: data.email,
    subject: "Failed Login Attempt",
    html: `
      <h2>Failed Login Attempt</h2>
      <p>A failed login attempt was detected:</p>
      <ul>
        <li>Location: ${data.location}</li>
        <li>IP Address: ${data.ip_address}</li>
        <li>Time: ${new Date(data.timestamp).toLocaleString()}</li>
        <li>Attempts: ${data.attempts}</li>
      </ul>
      <p>If this wasn't you, your account might be under attack. Please review your security settings.</p>
    `,
  }),
  PASSWORD_CHANGED: (data) => ({
    to: data.email,
    subject: "Password Changed",
    html: `
      <h2>Your Password Was Changed</h2>
      <p>Your account password was changed on ${new Date(
        data.timestamp
      ).toLocaleString()}</p>
      <p>If you didn't make this change, please contact support immediately.</p>
    `,
  }),
  SECURITY_QUESTIONS_UPDATED: (data) => ({
    to: data.email,
    subject: "Security Questions Updated",
    html: `
      <h2>Security Questions Updated</h2>
      <p>Your account security questions have been updated.</p>
      <p>These questions will help you recover your account if needed.</p>
    `,
  }),
  DEVICE_REMOVED: (data) => ({
    to: data.email,
    subject: "Device Removed",
    html: `
      <h2>Device Removed from Your Account</h2>
      <p>A device has been removed from your account:</p>
      <ul>
        <li>Device: ${data.device_name}</li>
        <li>Browser: ${data.browser}</li>
        <li>Last Active: ${new Date(data.last_active).toLocaleString()}</li>
      </ul>
    `,
  }),
  ACCOUNT_RECOVERY_ATTEMPTED: (data) => ({
    to: data.email,
    subject: "Account Recovery Attempt",
    html: `
      <h2>Account Recovery Attempt</h2>
      <p>Someone attempted to recover your account on ${new Date(
        data.timestamp
      ).toLocaleString()}</p>
      <p>Location: ${data.location}</p>
      <p>If this wasn't you, please secure your account immediately.</p>
    `,
  }),
};

export async function sendSecurityEmail(
  userId: string,
  eventType: SecurityEventType,
  eventData: any
) {
  try {
    // Get user's email and notification preferences
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, email_notifications")
      .eq("id", userId)
      .single();

    if (!profile?.email_notifications) {
      return; // User has disabled email notifications
    }

    const template = templates[eventType](eventData);
    const emailData: EmailData = {
      ...template,
      to: profile.email, // Moved to after spread to ensure it takes precedence
    };

    // Send email using Supabase's built-in email service
    await supabase.auth.admin.sendRawEmail(emailData);

    // Log the email sent
    await supabase.from("security_logs").insert({
      profile_id: userId,
      type: `EMAIL_SENT_${eventType}`,
      details: { email_type: eventType },
    });
  } catch (error) {
    console.error("Failed to send security email:", error);
    // Log the failure
    await supabase.from("security_logs").insert({
      profile_id: userId,
      type: "EMAIL_FAILED",
      details: { error: error.message, event_type: eventType },
    });
  }
}
