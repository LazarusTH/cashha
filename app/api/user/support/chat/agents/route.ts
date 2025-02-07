import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'
import { rateLimit } from '@/lib/utils/rate-limit'

export const GET = withAuth(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Get online support agents
    const { data: agents, error } = await supabase
      .from('support_agents')
      .select(`
        id,
        name,
        avatar_url,
        status,
        specialization,
        languages,
        last_active
      `)
      .eq('status', 'online')
      .order('last_active', { ascending: false })

    if (error) throw error

    // Get user's active tickets
    const { data: tickets, error: ticketsError } = await supabase
      .from('support_tickets')
      .select('id, agent_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (ticketsError && ticketsError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw ticketsError
    }

    // If user has an active ticket, mark their assigned agent
    const agentsWithAssignment = agents?.map(agent => ({
      ...agent,
      is_assigned: tickets?.agent_id === agent.id
    }))

    return NextResponse.json({ 
      agents: agentsWithAssignment || [],
      activeTicket: tickets || null
    })
  } catch (error: any) {
    console.error('Support agents error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch support agents' 
    }), { status: 500 })
  }
})
