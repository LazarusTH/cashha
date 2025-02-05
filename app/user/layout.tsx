"use client";

import type React from "react"
import UserSidebar from "@/components/user/UserSidebar"

export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen" style={{backgroundColor: "#020817"}}>
      <UserSidebar />
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  )
}

