import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminLayoutClient from "@/components/admin/admin-layout-client";

// Force dynamic rendering
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Session error:', sessionError);
      redirect("/auth/login");
    }

    if (!session) {
      redirect("/auth/login");
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      redirect("/auth/login");
    }

    if (!profile || profile.role !== "admin") {
      redirect("/user/dashboard");
    }

    return <AdminLayoutClient>{children}</AdminLayoutClient>;
  } catch (error) {
    console.error('Admin layout error:', error);
    redirect("/auth/login");
  }
}
