import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAdmin } from '@/middleware/admin'
import { logAdminAction } from '@/lib/utils/audit-logger'
import { rateLimit } from '@/lib/utils/rate-limit'

export const PUT = withAdmin(async (req: Request, { params }: { params: { id: string } }) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const updates = await req.json()

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Update bank
    const { data: bank, error } = await supabase
      .from('banks')
      .update({
        name: updates.name,
        code: updates.code,
        logo_url: updates.logo_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    // Log action
    await logAdminAction(user.id, 'UPDATE_BANK', {
      bankId: params.id,
      updates,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({ bank })
  } catch (error: any) {
    console.error('Bank update error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to update bank' 
    }), { status: 500 })
  }
})

export const DELETE = withAdmin(async (req: Request, { params }: { params: { id: string } }) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Check if bank has any active users
    const { data: activeUsers, error: checkError } = await supabase
      .from('user_banks')
      .select('user_id')
      .eq('bank_id', params.id)

    if (checkError) throw checkError

    if (activeUsers && activeUsers.length > 0) {
      return new NextResponse(JSON.stringify({ 
        error: 'Cannot delete bank with active users' 
      }), { status: 400 })
    }

    // Delete bank
    const { error } = await supabase
      .from('banks')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    // Log action
    await logAdminAction(user.id, 'DELETE_BANK', {
      bankId: params.id,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      message: 'Bank deleted successfully'
    })
  } catch (error: any) {
    console.error('Bank deletion error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to delete bank' 
    }), { status: 500 })
  }
})
