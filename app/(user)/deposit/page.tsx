"use client"

import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

const MAX_DEPOSIT_AMOUNT = 1000000 // $1M limit
const MIN_DEPOSIT_AMOUNT = 10 // $10 minimum

export default function DepositPage() {
  const [amount, setAmount] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const { toast } = useToast()
  const router = useRouter()

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {}
    
    // Validate amount
    const numAmount = Number(amount)
    if (!amount || isNaN(numAmount)) {
      newErrors.amount = 'Please enter a valid amount'
    } else if (numAmount < MIN_DEPOSIT_AMOUNT) {
      newErrors.amount = `Minimum deposit amount is $${MIN_DEPOSIT_AMOUNT}`
    } else if (numAmount > MAX_DEPOSIT_AMOUNT) {
      newErrors.amount = `Maximum deposit amount is $${MAX_DEPOSIT_AMOUNT}`
    }

    // Validate full name
    if (!fullName.trim()) {
      newErrors.fullName = 'Please enter your full name'
    } else if (fullName.length < 2) {
      newErrors.fullName = 'Name is too short'
    } else if (!/^[a-zA-Z\s'-]+$/.test(fullName)) {
      newErrors.fullName = 'Name contains invalid characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          amount: Number(amount), 
          fullName: fullName.trim() 
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process deposit')
      }

      toast({
        title: 'Success',
        description: 'Your deposit request has been submitted successfully.',
      })

      // Reset form
      setAmount('')
      setFullName('')
      
      // Refresh the page data
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process deposit',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Make a Deposit</CardTitle>
          <CardDescription>
            Enter your deposit details below. Once submitted, an admin will review your request.
            Minimum deposit: ${MIN_DEPOSIT_AMOUNT}, Maximum deposit: ${MAX_DEPOSIT_AMOUNT.toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value)
                  if (errors.fullName) {
                    setErrors({ ...errors, fullName: '' })
                  }
                }}
                placeholder="Enter your full name"
                required
                disabled={loading}
                className={errors.fullName ? 'border-red-500' : ''}
              />
              {errors.fullName && (
                <p className="text-sm text-red-500">{errors.fullName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  if (errors.amount) {
                    setErrors({ ...errors, amount: '' })
                  }
                }}
                placeholder="Enter amount to deposit"
                min={MIN_DEPOSIT_AMOUNT}
                max={MAX_DEPOSIT_AMOUNT}
                step="0.01"
                required
                disabled={loading}
                className={errors.amount ? 'border-red-500' : ''}
              />
              {errors.amount && (
                <p className="text-sm text-red-500">{errors.amount}</p>
              )}
            </div>
            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Submit Deposit Request'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
