import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAdmin } from '@/middleware/admin'
import { logAdminAction } from '@/lib/utils/audit-logger'
import { rateLimit } from '@/lib/utils/rate-limit'
import { AppError } from '@/lib/utils/error-handler'
import { z } from 'zod'

// Validation schema for request body
const updateLimitsSchema = z.object({
  dailyLimit: z.number().min(0),
  monthlyLimit: z.number().min(0),
  sendLimit: z.number().min(0),
  withdrawLimit: z.number().min(0)
})

export const PUT = withAdmin(async (req: Request, { params }: { params: { id: string } }) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw new AppError('Authentication failed', 401)
    if (!user) throw new AppError('Unauthorized', 401)

    // Validate request body
    const body = await req.json()
    const validatedData = updateLimitsSchema.parse(body)

    // Get user details
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('daily_limit, monthly_limit, send_limit, withdraw_limit')
      .eq('id', params.id)
      .single()

    if (fetchError) {
      throw new AppError('Failed to fetch user profile', 500)
    }

    if (!profile) {
      throw new AppError('User not found', 404)
    }

    // Update user limits
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        daily_limit: validatedData.dailyLimit,
        monthly_limit: validatedData.monthlyLimit,
        send_limit: validatedData.sendLimit,
        withdraw_limit: validatedData.withdrawLimit,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)

    if (updateError) {
      throw new AppError('Failed to update user limits', 500)
    }

    // Create notification
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: params.id,
        type: 'limits_update',
        title: 'Transaction Limits Updated',
        content: `Your transaction limits have been updated. New sending limit: ${validatedData.sendLimit} ETB, New withdrawal limit: ${validatedData.withdrawLimit} ETB.`,
        read: false
      })

    if (notificationError) {
      console.error('Failed to create notification:', notificationError)
      // Don't throw here as this is not critical
    }

    // Log action
    try {
      await logAdminAction(
        supabase,
        user.id,
        params.id,
        'UPDATE_USER_LIMITS',
        JSON.stringify({
          userId: params.id,
          oldLimits: {
            daily: profile.daily_limit,
            monthly: profile.monthly_limit,
            send: profile.send_limit,
            withdraw: profile.withdraw_limit
          },
          newLimits: {
            daily: validatedData.dailyLimit,
            monthly: validatedData.monthlyLimit,
            send: validatedData.sendLimit,
            withdraw: validatedData.withdrawLimit
          },
          timestamp: new Date().toISOString()
        }),
        req.headers
      )
    } catch (logError) {
      console.error('Failed to log admin action:', logError)
      // Don't throw here as this is not critical
    }

    return NextResponse.json({ 
      success: true,
      message: 'User limits updated successfully'
    })
  } catch (error) {
    console.error('Error updating user limits:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid input',
          details: error.errors
        },
        { status: 400 }
      )
    }

    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
