import { NextResponse } from 'next/server'
import { z } from 'zod'
import { ERROR_MESSAGES } from '@/lib/utils/error-handler'

export function withValidation<T>(schema: z.Schema<T>, handler: Function) {
  return async (req: Request, ...args: any[]) => {
    try {
      const body = await req.json()
      const validatedData = schema.parse(body)
      ;(req as any).validatedData = validatedData
      return handler(req, ...args)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }))
        return NextResponse.json(
          { error: ERROR_MESSAGES.INVALID_INPUT, details: errors },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: ERROR_MESSAGES.SERVER_ERROR },
        { status: 500 }
      )
    }
  }
}
