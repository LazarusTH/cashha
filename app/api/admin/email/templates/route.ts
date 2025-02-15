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
    const { data: templates, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching email templates:', error)
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch templates' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

export const POST = withAdmin(async (req: Request, user: any) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  const supabase = createRouteHandlerClient({ cookies })

  try {
    const { name, subject, content } = await req.json()

    const { data: template, error } = await supabase
      .from('email_templates')
      .insert({ name, subject, content })
      .select()
      .single()

    if (error) throw error

    // Log action
    await logAdminAction(
      supabase,
      user.id,
      template.id,  // target id
      'CREATE_EMAIL_TEMPLATE',
      JSON.stringify({
        templateId: template.id,
        templateName: template.name,
        timestamp: new Date().toISOString()
      }),
      req.headers
    )

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error creating email template:', error)
    return new NextResponse(JSON.stringify({ error: 'Failed to create template' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
