import { HeroSection } from "@/components/hero-section"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { Database } from "@/types/supabase"

export const dynamic = "force-dynamic";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_SUPABASE_URL: string
      NEXT_PUBLIC_SUPABASE_ANON_KEY: string
    }
  }
}

async function getHeroContent() {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookies().get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookies().set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookies().set({ name, value: '', ...options })
        },
      },
    }
  )
  
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
  return <HeroSection content={heroContent} />
}
