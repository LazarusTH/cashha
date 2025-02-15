export const dynamic = 'force-dynamic'

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  const type = searchParams.get('type')

  if (!token || type !== 'email_verification') {
    return NextResponse.json({ 
      error: 'Invalid verification link' 
    }, {
      status: 400
    })
  }

  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email'
    })

    if (error) throw error

    return NextResponse.json({
      message: 'Email verified successfully'
    })
  } catch (error: any) {
    console.error('Email verification error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to verify email' 
    }, {
      status: 400
    })
  }
}
