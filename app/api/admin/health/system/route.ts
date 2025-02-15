export const dynamic = 'force-dynamic'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAdmin } from '@/middleware/admin'
import { rateLimit } from '@/lib/utils/rate-limit'
import os from 'os'
import { AppError } from '@/lib/utils/error-handler'
import { logger } from '@/lib/utils/logger'

export const GET = withAdmin(async (req: Request) => {
  try {
    const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
    if (rateLimitResponse) return rateLimitResponse

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
      logger.error('Database health check failed', dbError)
      throw new AppError('Database health check failed', 500, 'DB_HEALTH_CHECK_FAILED')
    }

    // Get recent system health logs with proper error handling
    const { data: healthLogs, error: logsError } = await supabase
      .from('system_health_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (logsError) {
      logger.error('Failed to fetch health logs', logsError)
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
      logger.warn('Failed to store health check', { error: insertError })
      // Don't throw here, just log the error as this is not critical
    }

    logger.info('Health check completed successfully', { metrics: systemMetrics })

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: systemMetrics,
      database: dbHealth,
      recentLogs: healthLogs
    })
  } catch (error) {
    logger.error('System health check error', error instanceof Error ? error : new Error('Unknown error'))
    
    // Log error to database
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

      await supabase
        .from('system_health_logs')
        .insert({
          service: 'system',
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
    } catch (logError) {
      logger.error('Failed to log health check error', logError instanceof Error ? logError : new Error('Unknown error'))
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
