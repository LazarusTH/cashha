import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = createClient(cookies())

    // Get user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile with related data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        *,
        bank_accounts (
          id,
          bank_id,
          account_number,
          account_name,
          is_default,
          created_at,
          bank:banks (
            id,
            name,
            logo_url
          )
        ),
        wallet (
          id,
          balance,
          currency,
          last_transaction_at
        ),
        verification (
          status,
          verified_at,
          documents
        )
      `)
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      )
    }

    // Get recent activities
    const { data: activities } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    // Get unread notifications count
    const { count: notificationCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('read', false)

    return NextResponse.json({
      profile,
      activities: activities || [],
      unread_notifications: notificationCount || 0
    })

  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = createClient(cookies())

    // Get user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const updates = await request.json()

    // Validate required fields
    if (!updates.full_name?.trim()) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      )
    }

    // Validate phone number format
    if (updates.phone && !/^\+[1-9]\d{1,14}$/.test(updates.phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    // Update profile
    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: updates.full_name,
        phone: updates.phone,
        address: updates.address,
        city: updates.city,
        country: updates.country,
        language: updates.language,
        timezone: updates.timezone,
        notification_preferences: updates.notification_preferences,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: session.user.id,
      type: 'profile_update',
      metadata: {
        changes: Object.keys(updates).join(', '),
        timestamp: new Date().toISOString()
      }
    })

    return NextResponse.json(profile)

  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createClient(cookies())

    // Get user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { setting, value } = await request.json()

    if (!setting) {
      return NextResponse.json(
        { error: 'Setting name is required' },
        { status: 400 }
      )
    }

    // Update specific setting
    const updates = {
      [setting]: value,
      updated_at: new Date().toISOString()
    }

    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Setting update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update setting' },
        { status: 500 }
      )
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: session.user.id,
      type: 'setting_update',
      metadata: {
        setting,
        value,
        timestamp: new Date().toISOString()
      }
    })

    return NextResponse.json(profile)

  } catch (error) {
    console.error('Setting update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
