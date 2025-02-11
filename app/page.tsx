"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { Database } from "@/types/supabase"

async function getHeroContent() {
  const supabase = createServerComponentClient<Database>({ cookies })
  
  try {
    const { data, error } = await supabase
      .from('hero_content')
      .select('*')
      .single()
    
    if (error) {
      console.error('Error fetching hero content:', error)
      return {
        title: 'Welcome to Cashora',
        description: 'Your comprehensive financial management solution'
      }
    }
    
    return data || {
      title: 'Welcome to Cashora',
      description: 'Your comprehensive financial management solution'
    }
  } catch (error) {
    console.error('Error:', error)
    return {
      title: 'Welcome to Cashora',
      description: 'Your comprehensive financial management solution'
    }
  }
}

export default async function Home() {
  const heroContent = await getHeroContent()
  
  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-400 to-purple-500 flex flex-col items-center justify-center text-white">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-6xl font-bold mb-4">{heroContent.title}</h1>
        <p className="text-xl mb-8">{heroContent.description}</p>
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
