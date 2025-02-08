'use client'

import { Loader2 } from 'lucide-react'

interface LoadingProps {
  text?: string
  className?: string
}

export function Loading({ text = 'Loading...', className = '' }: LoadingProps) {
  return (
    <div className={`flex items-center justify-center space-x-2 ${className}`}>
      <Loader2 className="h-4 w-4 animate-spin" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

interface LoadingPageProps {
  text?: string
}

export function LoadingPage({ text }: LoadingPageProps) {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <Loading text={text} />
    </div>
  )
}

interface LoadingOverlayProps {
  text?: string
}

export function LoadingOverlay({ text }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Loading text={text} />
    </div>
  )
}
