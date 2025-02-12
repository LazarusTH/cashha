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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile.role !== 'admin') {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
    }

    // Get users with transactions for receipt sending
    const { data: users, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        transactions:transactions(
          id,
          type,
          amount,
          status,
          created_at
        )
      `)
      .eq('is_active', true)
      .not('transactions', 'is', null)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Email receipt users fetch error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch users'
    return new NextResponse(JSON.stringify({ error: errorMessage }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

export const POST = withAdmin(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile.role !== 'admin') {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
    }

    const { user_ids, subject, message, transaction_ids } = await req.json()

    if (!user_ids || !user_ids.length) {
      return new NextResponse(JSON.stringify({ 
        error: 'No recipients selected' 
      }), { status: 400 })
    }

    if (!subject || !message) {
      return new NextResponse(JSON.stringify({ 
        error: 'Subject and message are required' 
      }), { status: 400 })
    }

    // Get recipient emails
    const { data: recipients, error: recipientsError } = await supabase
      .from('profiles')
      .select('id, email, email_preferences')
      .in('id', user_ids)
      .eq('is_active', true)

    if (recipientsError) throw recipientsError

    // Filter out users who have opted out of emails
    const validRecipients = recipients?.filter(r => 
      r.email_preferences?.receipts !== false
    ) || []

    if (!validRecipients.length) {
      return new NextResponse(JSON.stringify({ 
        error: 'No valid recipients found' 
      }), { status: 400 })
    }

    // Create email receipt batch
    const { data: batch, error: batchError } = await supabase
      .from('email_receipt_batches')
      .insert({
        sender_id: user.id,
        subject,
        message,
        total_recipients: validRecipients.length,
        status: 'pending'
      })
      .select()
      .single()

    if (batchError) throw batchError

    // Create individual email receipt records
    const emailRecords = validRecipients.map(recipient => ({
      batch_id: batch.id,
      user_id: recipient.id,
      email: recipient.email,
      status: 'pending',
      transaction_ids: transaction_ids?.[recipient.id] || []
    }))

    const { error: emailsError } = await supabase
      .from('email_receipts')
      .insert(emailRecords)

    if (emailsError) throw emailsError

    // Create activity log
    const { error: activityError } = await supabase
      .from('admin_activities')
      .insert({
        admin_id: user.id,
        action: 'email_receipt_batch_created',
        metadata: {
          batch_id: batch.id,
          recipient_count: validRecipients.length
        }
      })

    if (activityError) throw activityError

    return NextResponse.json({ 
      batch_id: batch.id,
      recipient_count: validRecipients.length
    })
  } catch (error) {
    console.error('Email receipt send error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to send receipts'
    return new NextResponse(JSON.stringify({ error: errorMessage }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
