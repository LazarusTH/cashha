import { NextResponse } from 'next/server'
import { authenticatedRoute } from '@/lib/auth'
import { supabase } from '@/lib/supabase/client'
import UAParser from 'ua-parser-js'
import { v4 as uuidv4 } from 'uuid'

export const GET = authenticatedRoute(async (req, { user }) => {
  try {
    const { data: devices, error } = await supabase
      .from('device_history')
      .select('*')
      .eq('user_id', user.id)
      .order('last_active', { ascending: false })

    if (error) throw error

    return NextResponse.json({ devices })
  } catch (error) {
    console.error('Error getting device history:', error)
    return NextResponse.json(
      { error: 'Failed to get device history' },
      { status: 500 }
    )
  }
})

export const POST = authenticatedRoute(async (req, { user }) => {
  try {
    const userAgent = req.headers.get('user-agent')
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
    
    // Parse user agent
    const parser = new UAParser(userAgent)
    const result = parser.getResult()

    // Generate a unique device ID
    const deviceId = uuidv4()

    // Create device info
    const deviceInfo = {
      user_id: user.id,
      device_id: deviceId,
      device_name: `${result.browser.name} on ${result.os.name}`,
      browser: result.browser.name,
      os: result.os.name,
      ip_address: ipAddress,
      is_current: true,
      last_active: new Date().toISOString()
    }

    // Set all other devices as not current
    await supabase
      .from('device_history')
      .update({ is_current: false })
      .eq('user_id', user.id)

    // Insert new device
    const { error } = await supabase
      .from('device_history')
      .insert(deviceInfo)

    if (error) throw error

    // Log new device
    await supabase
      .from('security_logs')
      .insert({
        user_id: user.id,
        type: 'new_device_added',
        details: {
          device_id: deviceId,
          timestamp: new Date().toISOString()
        },
        ip_address: ipAddress
      })

    return NextResponse.json({ success: true, deviceId })
  } catch (error) {
    console.error('Error adding device:', error)
    return NextResponse.json(
      { error: 'Failed to add device' },
      { status: 500 }
    )
  }
})

export const DELETE = authenticatedRoute(async (req, { user }) => {
  try {
    const { deviceId } = await req.json()

    // Delete device
    const { error } = await supabase
      .from('device_history')
      .delete()
      .eq('user_id', user.id)
      .eq('device_id', deviceId)

    if (error) throw error

    // Log device removal
    await supabase
      .from('security_logs')
      .insert({
        user_id: user.id,
        type: 'device_removed',
        details: {
          device_id: deviceId,
          timestamp: new Date().toISOString()
        },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing device:', error)
    return NextResponse.json(
      { error: 'Failed to remove device' },
      { status: 500 }
    )
  }
})
