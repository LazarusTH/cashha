import { NextResponse } from 'next/server'
import { authenticatedRoute } from '@/lib/auth'
import { supabase } from '@/lib/supabase/client'
import bcrypt from 'bcryptjs'

export const POST = authenticatedRoute(async (req, { user }) => {
  try {
    const { questions } = await req.json()

    // Validate questions format
    if (!Array.isArray(questions) || questions.length < 3) {
      return NextResponse.json(
        { error: 'At least 3 security questions are required' },
        { status: 400 }
      )
    }

    // Hash answers before storing
    const hashedQuestions = await Promise.all(
      questions.map(async (q: { question: string; answer: string }) => ({
        user_id: user.id,
        question: q.question,
        answer: await bcrypt.hash(q.answer.toLowerCase().trim(), 10)
      }))
    )

    // Delete existing questions
    await supabase
      .from('security_questions')
      .delete()
      .eq('user_id', user.id)

    // Insert new questions
    const { error } = await supabase
      .from('security_questions')
      .insert(hashedQuestions)

    if (error) throw error

    // Log security questions update
    await supabase
      .from('security_logs')
      .insert({
        user_id: user.id,
        type: 'security_questions_updated',
        details: { timestamp: new Date().toISOString() },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error setting security questions:', error)
    return NextResponse.json(
      { error: 'Failed to set security questions' },
      { status: 500 }
    )
  }
})

export const GET = authenticatedRoute(async (req, { user }) => {
  try {
    const { data: questions, error } = await supabase
      .from('security_questions')
      .select('question')
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ questions })
  } catch (error) {
    console.error('Error getting security questions:', error)
    return NextResponse.json(
      { error: 'Failed to get security questions' },
      { status: 500 }
    )
  }
})

export const PUT = authenticatedRoute(async (req, { user }) => {
  try {
    const { questionId, answer } = await req.json()

    // Get the stored question
    const { data: question } = await supabase
      .from('security_questions')
      .select('answer')
      .eq('id', questionId)
      .eq('user_id', user.id)
      .single()

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    // Verify answer
    const isValid = await bcrypt.compare(
      answer.toLowerCase().trim(),
      question.answer
    )

    if (!isValid) {
      // Log failed verification
      await supabase
        .from('security_logs')
        .insert({
          user_id: user.id,
          type: 'security_question_verification_failed',
          details: { timestamp: new Date().toISOString() },
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
        })

      return NextResponse.json(
        { error: 'Incorrect answer' },
        { status: 400 }
      )
    }

    // Log successful verification
    await supabase
      .from('security_logs')
      .insert({
        user_id: user.id,
        type: 'security_question_verified',
        details: { timestamp: new Date().toISOString() },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error verifying security question:', error)
    return NextResponse.json(
      { error: 'Failed to verify security question' },
      { status: 500 }
    )
  }
})
