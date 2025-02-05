import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-400 to-purple-500 flex flex-col items-center justify-center text-white">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-6xl font-bold mb-4">Welcome to Cashora</h1>
        <p className="text-xl mb-8">Your comprehensive financial management solution</p>
        {/* TODO: integrate dynamic hero text from backend */}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="space-x-4"
      >
        <Button asChild>
          <Link href="/signin">Sign In</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/signup">Create Account</Link>
        </Button>
      </motion.div>
    </div>
  )
}

