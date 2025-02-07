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
    const { searchParams } = new URL(req.url)
    const duration = searchParams.get('duration') || '24h' // 24h, 7d, 30d
    const metrics = searchParams.get('metrics')?.split(',') || ['all']

    // Calculate time range
    const now = new Date()
    const startDate = new Date(now.getTime() - getDurationInMs(duration))

    // Get system metrics
    const { data: systemMetrics, error: metricsError } = await supabase
      .from('system_metrics')
      .select('*')
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: true })

    if (metricsError) throw metricsError

    // Get performance metrics
    const { data: performanceData, error: perfError } = await supabase.rpc('calculate_performance_metrics', {
      start_date: startDate.toISOString(),
      end_date: now.toISOString()
    })

    if (perfError) throw perfError

    // Process and aggregate metrics
    const aggregatedMetrics = {
      system: groupMetricsByInterval(systemMetrics, duration),
      performance: performanceData,
      summary: {
        avgResponseTime: calculateAverage(systemMetrics, 'response_time'),
        avgCpuUsage: calculateAverage(systemMetrics, 'cpu_usage'),
        avgMemoryUsage: calculateAverage(systemMetrics, 'memory_usage'),
        totalErrors: systemMetrics?.filter(m => m.metric_name === 'error_count')
          .reduce((sum, m) => sum + (m.metric_value || 0), 0)
      }
    }

    return NextResponse.json(aggregatedMetrics)
  } catch (error: any) {
    console.error('Metrics fetch error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to fetch system metrics' 
    }), { status: 500 })
  }
})

function getDurationInMs(duration: string): number {
  const durations: { [key: string]: number } = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  }
  return durations[duration] || durations['24h']
}

function groupMetricsByInterval(metrics: any[], duration: string) {
  const interval = duration === '30d' ? '1d' : 
                  duration === '7d' ? '1h' : 
                  '5m'
  
  return metrics?.reduce((acc: any, metric) => {
    const timestamp = new Date(metric.timestamp)
    const key = getIntervalKey(timestamp, interval)
    
    acc[key] = acc[key] || {}
    acc[key][metric.metric_name] = metric.metric_value
    return acc
  }, {})
}

function getIntervalKey(date: Date, interval: string): string {
  if (interval === '1d') {
    return date.toISOString().split('T')[0]
  }
  if (interval === '1h') {
    return date.toISOString().slice(0, 13) + ':00'
  }
  // 5m interval
  const minutes = Math.floor(date.getMinutes() / 5) * 5
  return date.toISOString().slice(0, 14) + 
         minutes.toString().padStart(2, '0')
}

function calculateAverage(metrics: any[], metricName: string): number {
  const values = metrics?.filter(m => m.metric_name === metricName)
    .map(m => m.metric_value || 0)
  return values?.length ? 
    values.reduce((sum, val) => sum + val, 0) / values.length : 
    0
}
