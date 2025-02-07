import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAdmin } from '@/middleware/admin'
import { rateLimit } from '@/lib/utils/rate-limit'

export const POST = withAdmin(async (req: Request, user: any) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown', 20)
  if (rateLimitResponse) return rateLimitResponse

  const supabase = createRouteHandlerClient({ cookies })

  try {
    const { recipients } = await req.json()

    // Validate recipient emails
    const { data: users, error } = await supabase
      .from('profiles')
      .select('email, full_name')
      .in('email', recipients.map((r: any) => r.email))

    if (error) throw error

    const foundEmails = new Set(users?.map(u => u.email.toLowerCase()))
    const invalidRecipients = recipients.filter(
      (r: any) => !foundEmails.has(r.email.toLowerCase())
    )

    return NextResponse.json({
      valid: users || [],
      invalid: invalidRecipients,
      totalValid: users?.length || 0,
      totalInvalid: invalidRecipients.length
    })
  } catch (error: any) {
    console.error('Validation error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to validate recipients' 
    }), { status: 500 })
  }
})
