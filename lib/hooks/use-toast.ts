import { toast } from '@/components/ui/use-toast'

interface ToastOptions {
  title?: string
  description: string
  variant?: 'default' | 'destructive'
  duration?: number
}

export function useToast() {
  const showToast = ({
    title,
    description,
    variant = 'default',
    duration = 3000,
  }: ToastOptions) => {
    toast({
      title,
      description,
      variant,
      duration,
    })
  }

  const showError = (error: unknown) => {
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred'
    
    toast({
      title: 'Error',
      description: message,
      variant: 'destructive',
    })
  }

  const showSuccess = (message: string) => {
    toast({
      title: 'Success',
      description: message,
    })
  }

  return {
    showToast,
    showError,
    showSuccess,
  }
}
