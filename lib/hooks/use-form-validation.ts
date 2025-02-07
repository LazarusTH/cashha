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

  const clearErrors = () => {
    setErrors({})
  }

  return {
    errors,
    validateEmail,
    validatePassword,
    validateName,
    clearErrors,
  }
}
