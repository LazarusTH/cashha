'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from 'next/navigation';
import SecurityDashboard from "@/components/security/security-dashboard";
import { Skeleton } from "@/components/ui/skeleton";

export default function SecurityPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          router.push("/auth/login");
          return;
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

        setData({
          profile,
          loginAttempts: loginAttempts || [],
          securityLogs: securityLogs || []
        });
      } catch (error) {
        console.error('Error loading security data:', error);
        router.push("/auth/login");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <SecuritySkeleton />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <SecurityDashboard
        profile={data.profile}
        loginAttempts={data.loginAttempts}
        securityLogs={data.securityLogs}
      />
    </div>
  );
}

function SecuritySkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-[200px]" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[200px]" />
      </div>
      <Skeleton className="h-[300px]" />
    </div>
  );
}
