import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SecurityDashboard from "@/components/security/security-dashboard";

export default async function SecurityPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/auth/login");
  }

  // Fetch user's security settings
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      *,
      security_questions:security_questions(id, question),
      device_history:device_history(
        id,
        device_name,
        device_id,
        browser,
        os,
        ip_address,
        location,
        last_active,
        is_current
      )
    `)
    .eq("id", session.user.id)
    .single();

  // Fetch recent login attempts
  const { data: loginAttempts } = await supabase
    .from("login_attempts")
    .select("*")
    .eq("profile_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch security logs
  const { data: securityLogs } = await supabase
    .from("security_logs")
    .select("*")
    .eq("profile_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="container mx-auto py-8">
      <SecurityDashboard
        profile={profile}
        loginAttempts={loginAttempts}
        securityLogs={securityLogs}
      />
    </div>
  );
}
