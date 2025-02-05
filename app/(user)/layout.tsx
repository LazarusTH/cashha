import type React from "react"
import UserSidebar from "@/components/user/UserSidebar"

export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[280px_1fr]">
      <UserSidebar />
      <main className="flex-1 border-l bg-background">
        <div className="h-full px-4 py-6 lg:px-8">{children}</div>
      </main>
    </div>
  )
}

