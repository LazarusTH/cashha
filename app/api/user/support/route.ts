import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { createSupportRequest, getUserSupportRequests } from '@/lib/supabase/support'

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { subject, message } = await request.json()

    // Create support request
    const supportRequest = await createSupportRequest({
      userId: user.id,
      subject,
      message
    })

    return NextResponse.json(supportRequest)
  } catch (error) {
    console.error('Error creating support request:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function GET(request: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const supportRequests = await getUserSupportRequests(user.id)
    return NextResponse.json(supportRequests)
  } catch (error) {
    console.error('Error fetching support requests:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
