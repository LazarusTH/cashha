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
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) throw error

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching notification settings:', error)
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch notification settings' }), {
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
      .from('notification_settings')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    // Log action
    await logAdminAction(
      supabase,
      user.id,
      user.id,  // target is self
      'UPDATE_NOTIFICATION_SETTINGS',
      JSON.stringify({
        updates,
        timestamp: new Date().toISOString()
      }),
      req.headers
    )

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating notification settings:', error)
    return new NextResponse(JSON.stringify({ error: 'Failed to update notification settings' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
