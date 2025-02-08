import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/utils/rate-limit'
import { ERROR_MESSAGES } from '@/lib/utils/error-handler'

export async function withRateLimit(handler: Function) {
  return async (req: Request, ...args: any[]) => {
    const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
    if (rateLimitResponse) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.RATE_LIMIT },
        { status: 429 }
      )
    }
    return handler(req, ...args)
  }
}
