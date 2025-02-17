import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const token = requestUrl.searchParams.get('token');
    const type = requestUrl.searchParams.get('type');

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });

    if (type === 'recovery') {
      return NextResponse.redirect(new URL(`/reset-password?token=${token}`, request.url));
    }

    const { error } = await supabase.auth.verifyEmailChange(token);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.redirect(new URL('/signin?verified=true', request.url));
  } catch (error) {
    console.error('Error in verification:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
