import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

interface RateLimitConfig {
  interval: number // in seconds
  limit: number
}

const defaultConfig: RateLimitConfig = {
  interval: 60, // 1 minute
  limit: 60 // requests per minute
}

export async function rateLimit(
  identifier: string,
  config: RateLimitConfig = defaultConfig
): Promise<NextResponse | null> {
  try {
    const key = `rate_limit:${identifier}`
    
    // Get the current count
    const current = await redis.get<number>(key) || 0
    
    if (current >= config.limit) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests',
          retryAfter: config.interval
        }),
        { 
          status: 429,
          headers: {
            'Retry-After': config.interval.toString(),
            'Content-Type': 'application/json'
          }
        }
      )
    }
    
    // Increment the counter
    await redis.incr(key)
    
    // Set expiry if it's a new key
    if (current === 0) {
      await redis.expire(key, config.interval)
    }
    
    return null
  } catch (error) {
    console.error('Rate limit error:', error)
    // On error, allow the request to proceed
    return null
  }
}