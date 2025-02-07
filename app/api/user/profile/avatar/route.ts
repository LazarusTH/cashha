import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { withAuth } from '@/middleware/auth'
import { rateLimit } from '@/lib/utils/rate-limit'

export const POST = withAuth(async (req: Request) => {
  const rateLimitResponse = await rateLimit(req.headers.get('x-forwarded-for') || 'unknown')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return new NextResponse(JSON.stringify({ 
        error: 'No file provided' 
      }), { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return new NextResponse(JSON.stringify({ 
        error: 'Invalid file type. Only JPEG, PNG and GIF images are allowed.' 
      }), { status: 400 })
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB in bytes
    if (file.size > maxSize) {
      return new NextResponse(JSON.stringify({ 
        error: 'File size too large. Maximum size is 5MB.' 
      }), { status: 400 })
    }

    // Upload to storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    // Update user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single()

    if (profileError) throw profileError

    return NextResponse.json({ profile })
  } catch (error: any) {
    console.error('Avatar upload error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to upload avatar' 
    }), { status: 500 })
  }
})
