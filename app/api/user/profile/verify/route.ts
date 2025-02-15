import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
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

    // Get user's current verification status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('verification_status')
      .eq('id', user.id)
      .single()

    if (profileError) throw profileError

    if (profile.verification_status === 'verified') {
      return new NextResponse(JSON.stringify({ 
        error: 'Profile is already verified' 
      }), { status: 400 })
    }

    if (profile.verification_status === 'pending') {
      return new NextResponse(JSON.stringify({ 
        error: 'Verification request is already pending' 
      }), { status: 400 })
    }

    const formData = await req.formData()
    const idFront = formData.get('id_front') as File
    const idBack = formData.get('id_back') as File
    const selfie = formData.get('selfie') as File
    const idType = formData.get('id_type') as string
    const idNumber = formData.get('id_number') as string

    // Validate required fields
    if (!idFront || !idBack || !selfie || !idType || !idNumber) {
      return new NextResponse(JSON.stringify({ 
        error: 'All verification documents are required' 
      }), { status: 400 })
    }

    // Validate file types
    const allowedTypes = ['image/jpeg', 'image/png']
    const files = [idFront, idBack, selfie]
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return new NextResponse(JSON.stringify({ 
          error: 'Invalid file type. Only JPEG and PNG images are allowed.' 
        }), { status: 400 })
      }
    }

    // Validate file sizes (max 5MB each)
    const maxSize = 5 * 1024 * 1024 // 5MB in bytes
    for (const file of files) {
      if (file.size > maxSize) {
        return new NextResponse(JSON.stringify({ 
          error: 'File size too large. Maximum size is 5MB per file.' 
        }), { status: 400 })
      }
    }

    // Upload verification documents
    const uploadFile = async (file: File, prefix: string) => {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${prefix}-${Date.now()}.${fileExt}`
      const { data, error } = await supabase.storage
        .from('verifications')
        .upload(fileName, file)
      
      if (error) throw error
      
      const { data: { publicUrl } } = supabase.storage
        .from('verifications')
        .getPublicUrl(fileName)
      
      return publicUrl
    }

    const [idFrontUrl, idBackUrl, selfieUrl] = await Promise.all([
      uploadFile(idFront, 'id-front'),
      uploadFile(idBack, 'id-back'),
      uploadFile(selfie, 'selfie')
    ])

    // Create verification request
    const { data: verification, error: verificationError } = await supabase
      .from('profile_verifications')
      .insert({
        user_id: user.id,
        id_type: idType,
        id_number: idNumber,
        id_front_url: idFrontUrl,
        id_back_url: idBackUrl,
        selfie_url: selfieUrl,
        status: 'pending'
      })
      .select()
      .single()

    if (verificationError) throw verificationError

    // Update profile status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        verification_status: 'pending',
        verification_submitted_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) throw updateError

    // Create notification
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'verification_submitted',
        title: 'Verification Request Submitted',
        message: 'Your profile verification request has been submitted and is pending review.',
        metadata: {
          verification_id: verification.id
        }
      })

    if (notificationError) throw notificationError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Profile verification error:', error)
    return new NextResponse(JSON.stringify({ 
      error: error.message || 'Failed to submit verification request' 
    }), { status: 500 })
  }
})
