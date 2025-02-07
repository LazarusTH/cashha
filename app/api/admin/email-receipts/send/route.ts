import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAdmin } from '@/middleware/admin'
import { rateLimit } from '@/lib/utils/rate-limit'
import { generateReceiptPDF } from '@/lib/utils/pdf'
import { sendEmail } from '@/lib/utils/email'

export const POST = withAdmin(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { userIds, templateId, customMessage } = await req.json()

    // Get admin user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (templateError) throw templateError

    // Get users and their transactions
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        transactions(
          id,
          type,
          amount,
          status,
          created_at,
          reference,
          description
        )
      `)
      .in('id', userIds)
      .not('transactions', 'is', null)

    if (usersError) throw usersError

    // Send receipts to each user
    const results = await Promise.all(users.map(async (user) => {
      try {
        // Generate PDF receipt
        const pdfBuffer = await generateReceiptPDF({
          user,
          transactions: user.transactions,
          template: template.content
        })

        // Send email with PDF attachment
        await sendEmail({
          to: user.email,
          subject: template.subject,
          html: customMessage || template.content,
          attachments: [{
            filename: 'receipt.pdf',
            content: pdfBuffer
          }]
        })

        // Log email sent
        await supabase.from('email_logs').insert({
          user_id: user.id,
          admin_id: user.id,
          type: 'receipt',
          template_id: templateId,
          status: 'sent'
        })

        return {
          userId: user.id,
          email: user.email,
          status: 'success'
        }
      } catch (error) {
        console.error(`Failed to send receipt to ${user.email}:`, error)

        // Log email failure
        await supabase.from('email_logs').insert({
          user_id: user.id,
          admin_id: user.id,
          type: 'receipt',
          template_id: templateId,
          status: 'failed',
          error: error.message
        })

        return {
          userId: user.id,
          email: user.email,
          status: 'failed',
          error: error.message
        }
      }
    }))

    // Log activity
    await supabase.from('admin_activities').insert({
      admin_id: user.id,
      type: 'receipts_sent',
      description: `Sent receipts to ${results.filter(r => r.status === 'success').length} users`
    })

    return NextResponse.json({
      message: 'Receipts sent',
      results
    })
  } catch (error: any) {
    console.error('Receipt sending error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to send receipts' 
    }), { status: 500 })
  }
})
