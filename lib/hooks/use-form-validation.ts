import { useState } from 'react'

export type ValidationErrors = {
  [key: string]: string
}

export function useFormValidation() {
  const [errors, setErrors] = useState<ValidationErrors>({})

  const validateEmail = (email: string): boolean => {
    if (!email) {
      setErrors(prev => ({ ...prev, email: 'Email is required' }))
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setErrors(prev => ({ ...prev, email: 'Invalid email format' }))
      return false
    }
    setErrors(prev => ({ ...prev, email: '' }))
    return true
  }

  const validatePassword = (password: string): boolean => {
    if (!password) {
      setErrors(prev => ({ ...prev, password: 'Password is required' }))
      return false
    }
    if (password.length < 6) {
      setErrors(prev => ({ ...prev, password: 'Password must be at least 6 characters' }))
      return false
    }
    setErrors(prev => ({ ...prev, password: '' }))
    return true
  }

  const validateName = (name: string, field: string): boolean => {
    if (!name) {
      setErrors(prev => ({ ...prev, [field]: `${field} is required` }))
      return false
    }
    if (name.length < 2) {
      setErrors(prev => ({ ...prev, [field]: `${field} must be at least 2 characters` }))
      return false
    }
    setErrors(prev => ({ ...prev, [field]: '' }))
    return true
  }

  const validateTwoFactorCode = (code: string): boolean => {
    if (!code) {
      setErrors(prev => ({ ...prev, twoFactorCode: 'Two-factor code is required' }))
      return false
    }
    if (!/^\d{6}$/.test(code)) {
      setErrors(prev => ({ ...prev, twoFactorCode: 'Two-factor code must be 6 digits' }))
      return false
    }
    setErrors(prev => ({ ...prev, twoFactorCode: '' }))
    return true
  }

  const validateAddress = (address: string): boolean => {
    if (!address) {
      setErrors(prev => ({ ...prev, address: 'Address is required' }))
      return false
    }
    if (address.length < 5) {
      setErrors(prev => ({ ...prev, address: 'Address must be at least 5 characters' }))
      return false
    }
    setErrors(prev => ({ ...prev, address: '' }))
    return true
  }

  const clearErrors = () => {
    setErrors({})
  }

  return {
    errors,
    validateEmail,
    validatePassword,
    validateName,
    validateTwoFactorCode,
    validateAddress,
    clearErrors,
  }
}
