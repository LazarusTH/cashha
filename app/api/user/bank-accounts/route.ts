export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

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

    // Get user's bank accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('bank_accounts')
      .select(`
        *,
        banks (
          id,
          name,
          logo_url
        )
      `)
      .eq('user_id', session.user.id)
      .order('is_default', { ascending: false })

    if (accountsError) {
      console.error('Bank accounts fetch error:', accountsError)
      return NextResponse.json(
        { error: 'Failed to fetch bank accounts' },
        { status: 500 }
      )
    }

    return NextResponse.json(accounts)

  } catch (error) {
    console.error('Bank accounts fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
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

    const { bank_id, account_number, account_name } = await request.json()

    // Validate required fields
    if (!bank_id || !account_number || !account_name) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate bank exists
    const { data: bank } = await supabase
      .from('banks')
      .select('id')
      .eq('id', bank_id)
      .single()

    if (!bank) {
      return NextResponse.json(
        { error: 'Invalid bank selected' },
        { status: 400 }
      )
    }

    // Check if account number already exists
    const { data: existingAccount } = await supabase
      .from('bank_accounts')
      .select('id')
      .eq('bank_id', bank_id)
      .eq('account_number', account_number)
      .single()

    if (existingAccount) {
      return NextResponse.json(
        { error: 'This account number is already registered' },
        { status: 400 }
      )
    }

    // Get count of user's bank accounts
    const { count } = await supabase
      .from('bank_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)

    // Create bank account
    const { data: account, error: createError } = await supabase
      .from('bank_accounts')
      .insert({
        user_id: session.user.id,
        bank_id,
        account_number,
        account_name,
        is_default: count === 0, // Make default if it's the first account
      })
      .select(`
        *,
        banks (
          id,
          name,
          logo_url
        )
      `)
      .single()

    if (createError) {
      console.error('Bank account creation error:', createError)
      return NextResponse.json(
        { error: 'Failed to create bank account' },
        { status: 500 }
      )
    }

    return NextResponse.json(account)

  } catch (error) {
    console.error('Bank account creation error:', error)
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

    const { account_id } = await request.json()

    if (!account_id) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      )
    }

    // Verify account belongs to user
    const { data: account } = await supabase
      .from('bank_accounts')
      .select('id')
      .eq('id', account_id)
      .eq('user_id', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json(
        { error: 'Bank account not found' },
        { status: 404 }
      )
    }

    // Start a transaction to update default accounts
    const { data: updatedAccount, error: updateError } = await supabase.rpc(
      'set_default_bank_account',
      {
        p_user_id: session.user.id,
        p_account_id: account_id
      }
    )

    if (updateError) {
      console.error('Default bank account update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update default bank account' },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedAccount)

  } catch (error) {
    console.error('Bank account update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const account_id = searchParams.get('id')

    if (!account_id) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      )
    }

    // Verify account belongs to user and is not default
    const { data: account } = await supabase
      .from('bank_accounts')
      .select('is_default')
      .eq('id', account_id)
      .eq('user_id', session.user.id)
      .single()

    if (!account) {
      return NextResponse.json(
        { error: 'Bank account not found' },
        { status: 404 }
      )
    }

    if (account.is_default) {
      return NextResponse.json(
        { error: 'Cannot delete default bank account' },
        { status: 400 }
      )
    }

    // Delete the bank account
    const { error: deleteError } = await supabase
      .from('bank_accounts')
      .delete()
      .eq('id', account_id)
      .eq('user_id', session.user.id)

    if (deleteError) {
      console.error('Bank account deletion error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete bank account' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Bank account deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
