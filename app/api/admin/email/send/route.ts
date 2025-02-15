export const dynamic = 'force-dynamic'

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAdmin } from '@/middleware/admin'
import { logAdminAction } from '@/lib/utils/audit-logger'
import { rateLimit } from '@/lib/utils/rate-limit'
import { sendEmail } from '@/lib/utils/email'

export const POST = withAdmin(async (req: Request, user: any) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { recipients, subject, template, data } = await req.json()

    // Send email using template
    await sendEmail({
      to: recipients,
      subject,
      template,
      data
    })

    // Log action
    await logAdminAction(
      supabase,
      user.id,
      user.id,
      'SEND_EMAIL',
      JSON.stringify({
        recipients,
        subject,
        template,
        timestamp: new Date().toISOString()
      }),
      req.headers
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending email:', error)
    return new NextResponse(JSON.stringify({ error: 'Failed to send email' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
