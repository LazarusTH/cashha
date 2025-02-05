import type React from "react"
import AdminSidebar from "@/components/admin/AdminSidebar"
import { usePathname } from "next/navigation"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isSignInPage = pathname === "/admin"

  return (
    <div className={`min-h-screen ${isSignInPage ? "" : "md:grid md:grid-cols-[280px_1fr]"}`}>
      {!isSignInPage && <AdminSidebar />}
      <main className={`flex-1 ${isSignInPage ? "" : "border-l bg-background"}`}>
        <div className="h-full px-4 py-6 lg:px-8">{children}</div>
      </main>
    </div>
  )
}

