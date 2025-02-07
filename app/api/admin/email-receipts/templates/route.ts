import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAdmin } from '@/middleware/admin'
import { rateLimit } from '@/lib/utils/rate-limit'

export const GET = withAdmin(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'receipt'

    // Get templates
    const { data: templates, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('type', type)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ templates })
  } catch (error: any) {
    console.error('Templates fetch error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch templates' 
    }), { status: 500 })
  }
})

export const POST = withAdmin(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { name, subject, content, type = 'receipt' } = await req.json()

    // Get admin user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Create template
    const { data: template, error } = await supabase
      .from('email_templates')
      .insert({
        name,
        subject,
        content,
        type,
        created_by: user.id
      })
      .select()
      .single()

    if (error) throw error

    // Log activity
    await supabase.from('admin_activities').insert({
      admin_id: user.id,
      type: 'template_created',
      description: `Created ${type} template: ${name}`
    })

    return NextResponse.json({ template })
  } catch (error: any) {
    console.error('Template creation error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to create template' 
    }), { status: 500 })
  }
})
