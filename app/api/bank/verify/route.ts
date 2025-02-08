import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { bankName, accountNumber, accountName } = body

    // Validate bank name
    const validBanks = [
      "Commercial Bank of Ethiopia",
      "Dashen Bank",
      "Awash Bank",
      "Abyssinia Bank",
      "Nib International Bank",
      "United Bank",
      "Wegagen Bank",
      "Zemen Bank",
      "Oromia International Bank",
      "Cooperative Bank of Oromia",
    ]
    
    if (!validBanks.includes(bankName)) {
      return NextResponse.json(
        { error: 'Invalid bank selected' },
        { status: 400 }
      )
    }

    // Validate account number format
    if (!/^\d{10,16}$/.test(accountNumber)) {
      return NextResponse.json(
        { error: 'Invalid account number format' },
        { status: 400 }
      )
    }

    // Validate account name
    if (!accountName || accountName.length < 3) {
      return NextResponse.json(
        { error: 'Invalid account name' },
        { status: 400 }
      )
    }

    // In a real application, you would:
    // 1. Make an API call to the bank to verify the account
    // 2. Verify the account name matches
    // 3. Check if the account is active
    // 4. Possibly cache the verification result

    return NextResponse.json({
      verified: true,
      bankName,
      accountNumber,
      accountName,
      // Add any additional verification details here
    })
  } catch (error) {
    console.error('Bank account verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify bank account' },
      { status: 500 }
    )
  }
}
