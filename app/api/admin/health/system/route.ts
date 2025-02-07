import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAdmin } from '@/middleware/admin'
import { rateLimit } from '@/lib/utils/rate-limit'
import os from 'os'

export const GET = withAdmin(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get system metrics
    const systemMetrics = {
      cpu: {
        loadAverage: os.loadavg(),
        cpus: os.cpus().length,
        uptime: os.uptime()
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        usage: (1 - os.freemem() / os.totalmem()) * 100
      }
    }

    // Get database health
    const { data: dbHealth, error: dbError } = await supabase
      .rpc('check_database_health')

    if (dbError) throw dbError

    // Get recent system health logs
    const { data: healthLogs, error: logsError } = await supabase
      .from('system_health_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (logsError) throw logsError

    // Store current health check
    const { error: insertError } = await supabase
      .from('system_health_logs')
      .insert({
        service: 'system',
        status: 'healthy',
        metrics: systemMetrics
      })

    if (insertError) throw insertError

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: systemMetrics,
      database: dbHealth,
      recentLogs: healthLogs
    })
  } catch (error: any) {
    console.error('System health check error:', error)
    
    // Log error
    const supabase = createRouteHandlerClient({ cookies })
    await supabase
      .from('system_health_logs')
      .insert({
        service: 'system',
        status: 'error',
        error: error.message
      })

    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to check system health',
      status: 'error',
      timestamp: new Date().toISOString()
    }), { status: 500 })
  }
})
