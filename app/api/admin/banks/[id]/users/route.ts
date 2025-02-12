import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAdmin } from '@/middleware/admin'
import { logAdminAction } from '@/lib/utils/audit-logger'
import { rateLimit } from '@/lib/utils/rate-limit'

export const POST = withAdmin(async (req: Request, { params }: { params: { id: string } }) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { userIds } = await req.json()

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Assign users to bank
    const assignments = userIds.map((userId: string) => ({
      bank_id: params.id,
      user_id: userId,
      assigned_by: user.id,
      created_at: new Date().toISOString()
    }))

    const { data: userBanks, error } = await supabase
      .from('user_banks')
      .upsert(assignments)
      .select()

    if (error) throw error

    // Log action
    await logAdminAction(
      supabase,
      user.id,
      params.id,
      'ASSIGN_USERS_TO_BANK',
      JSON.stringify({
        bankId: params.id,
        userIds,
        timestamp: new Date().toISOString()
      }),
      req.headers
    )

    return NextResponse.json({ userBanks })
  } catch (error: any) {
    console.error('Bank user assignment error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to assign users to bank' 
    }), { status: 500 })
  }
})

export const DELETE = withAdmin(async (req: Request, { params }: { params: { id: string } }) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { userIds } = await req.json()

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Remove users from bank
    const { error } = await supabase
      .from('user_banks')
      .delete()
      .eq('bank_id', params.id)
      .in('user_id', userIds)

    if (error) throw error

    // Log action
    await logAdminAction(
      supabase,
      user.id,
      params.id,
      'REMOVE_USERS_FROM_BANK',
      JSON.stringify({
        bankId: params.id,
        userIds,
        timestamp: new Date().toISOString()
      }),
      req.headers
    )

    return NextResponse.json({
      message: 'Users removed from bank successfully'
    })
  } catch (error: any) {
    console.error('Bank user removal error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to remove users from bank' 
    }), { status: 500 })
  }
})
