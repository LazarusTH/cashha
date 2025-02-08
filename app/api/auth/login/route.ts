import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDeviceInfo, getLocationInfo, isSuspiciousLogin } from "@/lib/utils/device-detection";
import { sendSecurityEmail } from "@/lib/email/security-notifications";

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { email, password } = await request.json();

    // Get IP and user agent
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || "";

    // Get device and location info
    const deviceInfo = getDeviceInfo(userAgent);
    const locationInfo = getLocationInfo(ip);

    // Check for recent failed attempts
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const { data: recentAttempts } = await supabase
      .from("login_attempts")
      .select("*")
      .eq("email", email)
      .gte("created_at", tenMinutesAgo.toISOString())
      .eq("success", false);

    // If too many failed attempts, require waiting
    if (recentAttempts && recentAttempts.length >= 5) {
      return NextResponse.json(
        {
          error: "Too many failed attempts. Please try again later.",
          waitTime: 10, // minutes
        },
        { status: 429 }
      );
    }

    // Attempt login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Record the attempt
    const attemptData = {
      email,
      ip_address: ip,
      location: locationInfo ? JSON.stringify(locationInfo) : null,
      device_info: JSON.stringify(deviceInfo),
      success: !error,
      error: error?.message,
    };

    await supabase.from("login_attempts").insert([attemptData]);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    // Get user's profile and last login info
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user?.id)
      .single();

    // Check if this is a suspicious login
    let isSuspicious = false;
    if (profile?.last_login_location) {
      const lastLocation = JSON.parse(profile.last_login_location);
      isSuspicious = isSuspiciousLogin(locationInfo, lastLocation);
    }

    // Update profile with new login info
    await supabase
      .from("profiles")
      .update({
        last_login: new Date().toISOString(),
        last_login_ip: ip,
        last_login_location: JSON.stringify(locationInfo),
      })
      .eq("id", data.user?.id);

    // Record the device
    await supabase.from("device_history").upsert(
      {
        profile_id: data.user?.id,
        device_id: deviceInfo.deviceId,
        device_name: `${deviceInfo.deviceType} - ${deviceInfo.os}`,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        ip_address: ip,
        location: JSON.stringify(locationInfo),
        last_active: new Date().toISOString(),
        is_current: true,
      },
      { onConflict: "device_id" }
    );

    // Send security notification
    if (profile?.email_notifications) {
      await sendSecurityEmail(data.user?.id!, "NEW_LOGIN", {
        device_name: `${deviceInfo.deviceType} - ${deviceInfo.os}`,
        browser: deviceInfo.browser,
        location: locationInfo,
        ip_address: ip,
        timestamp: new Date().toISOString(),
      });

      if (isSuspicious) {
        await sendSecurityEmail(data.user?.id!, "SUSPICIOUS_LOGIN", {
          location: locationInfo,
          ip_address: ip,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      user: data.user,
      isSuspicious,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
