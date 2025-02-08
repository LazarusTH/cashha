import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const supabase = createClient(cookies())

    // Get user session and verify admin role
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Get system settings
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('*')
      .single()

    if (settingsError) {
      console.error('Settings fetch error:', settingsError)
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      )
    }

    return NextResponse.json(settings)

  } catch (error) {
    console.error('Settings fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = createClient(cookies())

    // Get user session and verify admin role
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const updates = await request.json()

    // Validate required fields
    if (typeof updates.generalWithdrawalLimit !== 'string' ||
        typeof updates.generalSendingLimit !== 'string' ||
        typeof updates.maintenanceMode !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid settings format' },
        { status: 400 }
      )
    }

    // Convert limits to numbers and validate
    const withdrawalLimit = parseFloat(updates.generalWithdrawalLimit)
    const sendingLimit = parseFloat(updates.generalSendingLimit)

    if (isNaN(withdrawalLimit) || isNaN(sendingLimit) || 
        withdrawalLimit < 0 || sendingLimit < 0) {
      return NextResponse.json(
        { error: 'Invalid limit values' },
        { status: 400 }
      )
    }

    // Update settings
    const { data: settings, error: updateError } = await supabase
      .from('system_settings')
      .update({
        general_withdrawal_limit: withdrawalLimit,
        general_sending_limit: sendingLimit,
        maintenance_mode: updates.maintenanceMode,
        updated_at: new Date().toISOString(),
        updated_by: session.user.id
      })
      .eq('id', 1) // Assuming we have a single settings record
      .select()
      .single()

    if (updateError) {
      console.error('Settings update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      )
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: session.user.id,
      type: 'settings_update',
      metadata: {
        changes: Object.keys(updates).join(', '),
        timestamp: new Date().toISOString()
      }
    })

    return NextResponse.json(settings)

  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
