"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LogOut,
  LayoutDashboard,
  History,
  ArrowUpFromLine,
  ArrowDownToLine,
  Send,
  User,
  MessageSquare,
  Menu,

  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

const navItems = [
  { name: "Dashboard", href: "/user/dashboard", icon: LayoutDashboard },
  { name: "Transactions", href: "/user/transactions", icon: History },
  { name: "Deposit", href: "/user/deposit", icon: ArrowUpFromLine },
  { name: "Withdraw", href: "/user/withdraw", icon: ArrowDownToLine },
  { name: "Send", href: "/user/send", icon: Send },
  { name: "Profile", href: "/user/profile", icon: User },
  { name: "Customer Support", href: "/user/support", icon: MessageSquare },
]

export default function UserSidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const handleLogout = () => {
    router.push("/signin")
  }


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
        className={`bg-gray-900 text-white w-[280px] min-h-screen fixed md:sticky top-0 left-0 z-40 transition-transform duration-300 ease-in-out ${
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
                  pathname === item.href ? "bg-gray-800" : ""
                } text-lg`}
                onClick={() => setIsOpen(false)}
              >
                <item.icon className="h-5 w-5" /> 
                <span>{item.name}</span>
              </Link>
            ))}
            <Button
              onClick={handleLogout}
              className="flex items-center w-full space-x-2 p-2 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer text-lg"
            >
              <LogOut className="h-5 w-5" />
              <span>
                Logout
              </span>
            </Button>
          </nav>
        </ScrollArea>
      </aside>
    </>
  )
}

