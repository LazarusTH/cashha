import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';
import { rateLimit } from '@/lib/utils/rate-limit'
import { logAdminAction } from '@/lib/utils/audit-logger'

export async function GET(req: Request) {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get user from session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) throw profileError

    // Get user transactions
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select(`
        id,
        amount,
        type,
        status,
        description,
        created_at,
        sender:profiles!sender_id(email),
        recipient:profiles!recipient_id(email)
      `)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (txError) throw txError

    // Get notification preferences
    const { data: preferences, error: prefError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (prefError && prefError.code !== 'PGRST116') throw prefError

    // Get account settings
    const { data: settings, error: settingsError } = await supabase
      .from('user_account_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (settingsError && settingsError.code !== 'PGRST116') throw settingsError

    // Compile user data
    const userData = {
      profile: {
        ...profile,
        email: user.email
      },
      transactions: transactions?.map(tx => ({
        ...tx,
        sender: tx.sender?.email,
        recipient: tx.recipient?.email
      })),
      preferences: preferences || null,
      settings: settings || null,
      exportDate: new Date().toISOString()
    }

    // Log action
    await logAdminAction(user.id, 'DATA_EXPORT', {
      timestamp: new Date().toISOString()
    })

    return new NextResponse(JSON.stringify(userData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="cashora-data-${new Date().toISOString().split('T')[0]}.json"`
      }
    })
  } catch (error: any) {
    console.error('Data export error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to export account data' 
    }), { status: 500 })
  }
}
