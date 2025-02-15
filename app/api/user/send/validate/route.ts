export const dynamic = 'force-dynamic';

import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/utils/rate-limit";

export async function POST(request: Request) {
  const rateLimitResponse = await rateLimit(request.headers.get('x-forwarded-for') || 'unknown');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { amount, recipientId } = await request.json();

    // Get user's profile
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // Get user's profile with balance and limits
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_balance, daily_transfer_limit")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return new NextResponse(JSON.stringify({ error: "Profile not found" }), { status: 404 });
    }

    // Check if recipient exists
    const { data: recipient } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", recipientId)
      .single();

    if (!recipient) {
      return new NextResponse(JSON.stringify({ error: "Recipient not found" }), { status: 404 });
    }

    // Check if amount is valid
    if (!amount || amount <= 0) {
      return new NextResponse(JSON.stringify({ error: "Invalid amount" }), { status: 400 });
    }

    // Check if user has sufficient balance
    if (profile.account_balance < amount) {
      return new NextResponse(JSON.stringify({ error: "Insufficient balance" }), { status: 400 });
    }

    // Check daily transfer limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: dailyTransfers } = await supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", user.id)
      .eq("type", "transfer")
      .gte("created_at", today.toISOString());

    const dailyTotal = (dailyTransfers || []).reduce((sum, t) => sum + t.amount, 0) + amount;

    if (dailyTotal > profile.daily_transfer_limit) {
      return new NextResponse(
        JSON.stringify({ error: "Daily transfer limit exceeded" }),
        { status: 400 }
      );
    }

    return new NextResponse(JSON.stringify({ valid: true }));
  } catch (error: any) {
    console.error("Validate transfer error:", error);
    return new NextResponse(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500 }
    );
  }
}
