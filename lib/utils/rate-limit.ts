import { NextResponse } from 'next/server'

interface RateLimitConfig {
  ip: string
  limit?: number
  duration?: number // in seconds
}

const rateLimitStore = new Map<string, { count: number; timestamp: number }>()

export async function rateLimit(config: RateLimitConfig | string) {
  const rateLimitConfig: RateLimitConfig = typeof config === 'string' 
    ? { ip: config }
    : config

  const { 
    ip,
    limit = 5,
    duration = 3600 // 1 hour default
  } = rateLimitConfig

  const now = Date.now()
  const key = `${ip}-${Math.floor(now / (duration * 1000))}`
  const record = rateLimitStore.get(key) || { count: 0, timestamp: now }

  // Reset if duration has passed
  if (now - record.timestamp > duration * 1000) {
    record.count = 0
    record.timestamp = now
  }

  record.count++
  rateLimitStore.set(key, record)

  if (record.count > limit) {
    return NextResponse.json(
      { error: 'Too many requests, please try again later.' },
      { status: 429 }
    )
  }

  return null
}