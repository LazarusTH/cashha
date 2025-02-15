export const dynamic = 'force-dynamic'

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'
import { rateLimit } from '@/lib/utils/rate-limit'

export const POST = withAuth(async (req: Request, { params }: { params: { id: string } }) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Get current bank account
    const { data: account, error: accountError } = await supabase
      .from('user_bank_accounts')
      .select('id, user_id, verification_status')
      .eq('id', params.id)
      .single()

    if (accountError || !account) {
      return new NextResponse(JSON.stringify({ 
        error: 'Bank account not found' 
      }), { status: 404 })
    }

    // Verify ownership
    if (account.user_id !== user.id) {
      return new NextResponse(JSON.stringify({ 
        error: 'Unauthorized' 
      }), { status: 403 })
    }

    // Check if already verified or verification in progress
    if (account.verification_status === 'verified') {
      return new NextResponse(JSON.stringify({ 
        error: 'Bank account is already verified' 
      }), { status: 400 })
    }

    if (account.verification_status === 'pending') {
      return new NextResponse(JSON.stringify({ 
        error: 'Verification is already in progress' 
      }), { status: 400 })
    }

    const { proof_type, proof_file } = await req.json()

    // Validate proof type
    const validProofTypes = ['bank_statement', 'void_check', 'bank_letter']
    if (!validProofTypes.includes(proof_type)) {
      return new NextResponse(JSON.stringify({ 
        error: 'Invalid proof type' 
      }), { status: 400 })
    }

    // Create verification request
    const { data: verification, error: verificationError } = await supabase
      .from('bank_account_verifications')
      .insert({
        user_id: user.id,
        bank_account_id: params.id,
        proof_type,
        proof_file,
        status: 'pending'
      })
      .select()
      .single()

    if (verificationError) throw verificationError

    // Update bank account status
    const { data: updated, error } = await supabase
      .from('user_bank_accounts')
      .update({
        verification_status: 'pending',
        verification_submitted_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select(`
        id,
        bank_id,
        account_number,
        account_name,
        is_default,
        is_verified,
        verification_status,
        verification_submitted_at,
        last_used_at,
        created_at,
        banks (
          id,
          name,
          logo_url,
          swift_code
        )
      `)
      .single()

    if (error) throw error

    // Create notification
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'bank_verification_submitted',
        title: 'Bank Account Verification Submitted',
        message: 'Your bank account verification request has been submitted and is pending review.',
        metadata: {
          bank_account_id: params.id,
          verification_id: verification.id
        }
      })

    if (notificationError) throw notificationError

    return NextResponse.json({ account: updated })
  } catch (error: any) {
    console.error('Bank verification error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to submit bank verification' 
    }), { status: 500 })
  }
})
