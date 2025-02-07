import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAdmin } from '@/middleware/admin'
import { logAdminAction } from '@/lib/utils/audit-logger'
import { rateLimit } from '@/lib/utils/rate-limit'

export const GET = withAdmin(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(req.url)
    const withUsers = searchParams.get('withUsers') === 'true'

    // Get banks with optional user assignments
    let query = supabase.from('banks').select(
      withUsers ? `
        *,
        user_banks(
          user:profiles(
            id,
            full_name,
            email
          )
        )
      ` : '*'
    )

    const { data: banks, error } = await query
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ banks })
  } catch (error: any) {
    console.error('Banks fetch error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch banks' 
    }), { status: 500 })
  }
})

export const POST = withAdmin(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { name, code, logo_url } = await req.json()

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Create bank
    const { data: bank, error } = await supabase
      .from('banks')
      .insert({
        name,
        code,
        logo_url,
        created_by: user.id
      })
      .select()
      .single()

    if (error) throw error

    // Log action
    await logAdminAction(user.id, 'CREATE_BANK', {
      bankId: bank.id,
      bankName: name,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({ bank })
  } catch (error: any) {
    console.error('Bank creation error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to create bank' 
    }), { status: 500 })
  }
})
