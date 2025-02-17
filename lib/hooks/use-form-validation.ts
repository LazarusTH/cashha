import { useState } from 'react'

export type ValidationErrors = {
  email?: string;
  password?: string;
  name?: string;
  amount?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  recipientId?: string;
  message?: string;
}

export function useFormValidation() {
  const [errors, setErrors] = useState<ValidationErrors>({})

  const validateEmail = (email: string): boolean => {
    if (!email) {
      setErrors(prev => ({ ...prev, email: 'Email is required' }))
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors(prev => ({ ...prev, email: 'Invalid email format' }))
      return false
    }
    setErrors(prev => ({ ...prev, email: undefined }))
    return true
  }

  const validatePassword = (password: string): boolean => {
    if (!password) {
      setErrors(prev => ({ ...prev, password: 'Password is required' }))
      return false
    }
    if (password.length < 8) {
      setErrors(prev => ({ ...prev, password: 'Password must be at least 8 characters' }))
      return false
    }
    setErrors(prev => ({ ...prev, password: undefined }))
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
    setErrors(prev => ({ ...prev, [field]: undefined }))
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
    setErrors(prev => ({ ...prev, address: undefined }))
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
    validateAddress,
    clearErrors,
  }
}
