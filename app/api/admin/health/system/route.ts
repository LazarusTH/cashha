import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAdmin } from '@/middleware/admin'
import { rateLimit } from '@/lib/utils/rate-limit'
import os from 'os'
import { AppError } from '@/lib/utils/error-handler'

export const GET = withAdmin(async (req: Request) => {
  try {
    const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
    if (rateLimitResponse) return rateLimitResponse

    const supabase = createRouteHandlerClient({ cookies })

    // Get system metrics with error handling
    const systemMetrics = {
      cpu: {
        loadAverage: os.loadavg(),
        cpus: os.cpus().length,
        uptime: os.uptime()
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        usage: Number(((1 - os.freemem() / os.totalmem()) * 100).toFixed(2))
      }
    }

    // Get database health with proper error handling
    const { data: dbHealth, error: dbError } = await supabase
      .rpc('check_database_health')

    if (dbError) {
      throw new AppError('Database health check failed', 500, 'DB_HEALTH_CHECK_FAILED')
    }

    // Get recent system health logs with proper error handling
    const { data: healthLogs, error: logsError } = await supabase
      .from('system_health_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (logsError) {
      throw new AppError('Failed to fetch health logs', 500, 'HEALTH_LOGS_FETCH_FAILED')
    }

    // Store current health check with proper error handling
    const { error: insertError } = await supabase
      .from('system_health_logs')
      .insert({
        service: 'system',
        status: 'healthy',
        metrics: systemMetrics
      })

    if (insertError) {
      console.error('Failed to store health check:', insertError)
      // Don't throw here, just log the error as this is not critical
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: systemMetrics,
      database: dbHealth,
      recentLogs: healthLogs
    })
  } catch (error) {
    console.error('System health check error:', error)
    
    // Log error to database
    try {
      const supabase = createRouteHandlerClient({ cookies })
      await supabase
        .from('system_health_logs')
        .insert({
          service: 'system',
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
    } catch (logError) {
      console.error('Failed to log health check error:', logError)
    }

    // Return appropriate error response
    const statusCode = error instanceof AppError ? error.statusCode : 500
    const message = error instanceof Error ? error.message : 'System health check failed'
    
    return NextResponse.json({ 
      error: message,
      status: 'error',
      timestamp: new Date().toISOString()
    }, { status: statusCode })
  }
})
