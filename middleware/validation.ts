import { NextResponse } from 'next/server'
import { z } from 'zod'
import { ERROR_MESSAGES } from '@/lib/utils/error-handler'

interface ValidationError {
  path: string
  message: string
}

export function withValidation<T>(
  schema: z.Schema<T>,
  handler: (req: Request & { validatedData: T }, ...args: any[]) => Promise<Response>,
  options: {
    stripUnknown?: boolean
    customErrorMap?: z.ZodErrorMap
  } = {}
) {
  return async (req: Request, ...args: any[]) => {
    try {
      // Clone the request to read the body
      const clone = req.clone()
      const body = await clone.json()

      // Parse and validate the request body
      const validatedData = await schema.parseAsync(body, {
        errorMap: options.customErrorMap,
        async: true
      })

      // Attach validated data to the request
      const enhancedReq = req as Request & { validatedData: T }
      enhancedReq.validatedData = validatedData

      // Call the handler with validated data
      return handler(enhancedReq, ...args)
    } catch (error) {
      console.error('Validation error:', error)

      if (error instanceof z.ZodError) {
        const errors: ValidationError[] = error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }))

        return NextResponse.json(
          {
            error: ERROR_MESSAGES.INVALID_INPUT,
            details: errors,
            status: 'error'
          },
          { status: 400 }
        )
      }

      // Handle unexpected errors
      return NextResponse.json(
        {
          error: ERROR_MESSAGES.SERVER_ERROR,
          status: 'error'
        },
        { status: 500 }
      )
    }
  }
}

// Helper function to create a validation schema with common options
export function createValidationSchema<T extends z.ZodRawShape>(
  shape: T,
  options: {
    strict?: boolean
    description?: string
  } = {}
) {
  const baseSchema = z.object(shape)
  return options.strict ? baseSchema.strict() : baseSchema
}

// Common validation schemas
export const commonSchemas = {
  id: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  date: z.string().datetime(),
  amount: z.number().positive(),
  pagination: z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(10)
  })
}
