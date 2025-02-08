import toast from '@/lib/toast'

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function isAppError(error: any): error is AppError {
  return error instanceof AppError
}

interface ErrorOptions {
  silent?: boolean
  showToast?: boolean
  toastTitle?: string
}

export async function handleError(error: unknown, options: ErrorOptions = {}) {
  const {
    silent = false,
    showToast = true,
    toastTitle = 'Error'
  } = options

  if (!silent) {
    console.error('Error:', error)
  }

  let message = 'An unexpected error occurred'
  let statusCode = 500

  if (error instanceof AppError) {
    message = error.message
    statusCode = error.statusCode
  } else if (error instanceof Error) {
    message = error.message
  } else if (typeof error === 'string') {
    message = error
  }

  if (showToast) {
    toast({
      title: toastTitle,
      description: message,
      variant: 'destructive',
    })
  }

  return {
    error: message,
    statusCode
  }
}

export function createErrorHandler(prefix: string) {
  return (error: unknown, options: ErrorOptions = {}) => {
    return handleError(error, {
      ...options,
      toastTitle: options.toastTitle || prefix
    })
  }
}

// Common error handlers
export const handleTransactionError = createErrorHandler('Transaction Error')
export const handleAuthError = createErrorHandler('Authentication Error')
export const handleNetworkError = createErrorHandler('Network Error')

// Common error messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'You must be logged in to perform this action',
  FORBIDDEN: 'You do not have permission to perform this action',
  INVALID_INPUT: 'Please check your input and try again',
  NETWORK_ERROR: 'Network error. Please check your connection and try again',
  SERVER_ERROR: 'Server error. Please try again later',
  RATE_LIMIT: 'Too many requests. Please try again later',
  INSUFFICIENT_FUNDS: 'Insufficient funds to complete this transaction',
  INVALID_AMOUNT: 'Invalid amount specified',
  LIMIT_EXCEEDED: 'Transaction limit exceeded',
  INVALID_RECIPIENT: 'Invalid recipient specified',
  INVALID_BANK_DETAILS: 'Invalid bank account details',
  INVALID_PAYMENT_METHOD: 'Invalid payment method',
} as const
