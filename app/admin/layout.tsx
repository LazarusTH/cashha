"use client";

import AdminSidebar from "@/components/admin/AdminSidebar"
import { usePathname } from "next/navigation"
import type React from "react"
import { DashboardLayout } from "@/components/dashboard/layout"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}
