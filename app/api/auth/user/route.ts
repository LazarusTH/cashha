import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  try {
    const { data: user, error } = await supabase
      .from('users') 
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
        console.error("Error fetching user:", error)
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}