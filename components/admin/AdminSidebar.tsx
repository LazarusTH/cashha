import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Building,
  ArrowDownToLine,
  ArrowUpToLine,
  Send,
  Mail,
  Settings,
  User,
  History,
  Menu,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

const navItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Users Management", href: "/admin/users", icon: Users },
  { name: "Banks", href: "/admin/banks", icon: Building },
  { name: "Withdrawal Requests", href: "/admin/withdrawals", icon: ArrowDownToLine },
  { name: "Deposit Requests", href: "/admin/deposits", icon: ArrowUpToLine },
  { name: "Sending Requests", href: "/admin/sending", icon: Send },
  { name: "Transaction History", href: "/admin/transactions", icon: History },
  { name: "Email", href: "/admin/email", icon: Mail },
  { name: "Settings", href: "/admin/settings", icon: Settings },
  { name: "Profile", href: "/admin/profile", icon: User },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>
      <aside
        className={`bg-gray-800 text-white w-[280px] min-h-screen fixed md:sticky top-0 left-0 z-40 transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <ScrollArea className="h-full">
          <nav className="space-y-2 p-4 mt-16 md:mt-0">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-700 transition-colors ${
                  pathname === item.href ? "bg-gray-700" : ""
                }`}
                onClick={() => setIsOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
        </ScrollArea>
      </aside>
    </>
  )
}

