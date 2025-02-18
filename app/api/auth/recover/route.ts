import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sendSecurityEmail } from "@/lib/email/security-notifications";

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { email, answers } = await request.json();

    // Get user profile and security questions
    const { data: profile } = await supabase
      .from("profiles")
      .select(`
        id,
        security_questions (
          question,
          answer
        )
      `)
      .eq("email", email)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Verify security questions
    const questions = profile.security_questions;
    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: "No security questions set" },
        { status: 400 }
      );
    }

    // Check if provided answers match
    const validAnswers = await Promise.all(
      questions.map(async (q, i) => {
        return bcrypt.compare(answers[i], q.answer);
      })
    );

    if (!validAnswers.every((valid) => valid)) {
      // Log failed attempt
      await supabase.from("security_logs").insert({
        profile_id: profile.id,
        type: "RECOVERY_FAILED",
        details: { method: "security_questions" },
      });

      return NextResponse.json(
        { error: "Invalid answers" },
        { status: 400 }
      );
    }

    // Generate password reset token
    const { error: resetError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
      },
    });

    if (resetError) {
      throw resetError;
    }

    // Log successful recovery
    await supabase.from("security_logs").insert({
      profile_id: profile.id,
      type: "RECOVERY_SUCCESS",
      details: { method: "security_questions" },
    });

    // Send notification email
    await sendSecurityEmail(profile.id, "ACCOUNT_RECOVERY_ATTEMPTED", {
      timestamp: new Date().toISOString(),
      location: request.headers.get("x-forwarded-for") || "unknown",
    });

    return NextResponse.json({
      message: "Recovery email sent",
    });
  } catch (error) {
    console.error("Recovery error:", error);
    return NextResponse.json(
      { error: "Failed to process recovery" },
      { status: 500 }
    );
  }
}

