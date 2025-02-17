export const dynamic = 'force-dynamic'

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAdmin } from '@/middleware/admin'
import { logAdminAction } from '@/lib/utils/audit-logger'
import { rateLimit } from '@/lib/utils/rate-limit'

export const GET = withAdmin(async (req: Request, user: any) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  const supabase = createRouteHandlerClient({ cookies })

  try {
    const { data: settings, error } = await supabase
      .from('security_settings')
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching security settings:', error)
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch security settings' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

export const PUT = withAdmin(async (req: Request, user: any) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  const supabase = createRouteHandlerClient({ cookies })

  try {
    const updates = await req.json()

    const { data: settings, error } = await supabase
      .from('security_settings')
      .update(updates)
      .select()
      .single()

    if (error) throw error

    // Log action
    await logAdminAction(
      supabase,
      user.id,
      user.id,  // target is self
      'UPDATE_SECURITY_SETTINGS',
      JSON.stringify({
        updates,
        timestamp: new Date().toISOString()
      }),
      req.headers
    )

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating security settings:', error)
    return new NextResponse(JSON.stringify({ error: 'Failed to update security settings' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
