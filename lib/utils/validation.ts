import { AppError } from './error-handler'

export function validateAmount(amount: number | string) {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  if (isNaN(numAmount)) {
    throw new AppError('Invalid amount format', 400)
  }
  
  if (numAmount <= 0) {
    throw new AppError('Amount must be greater than 0', 400)
  }
  
  // Check for more than 2 decimal places
  if (numAmount.toString().split('.')[1]?.length > 2) {
    throw new AppError('Amount cannot have more than 2 decimal places', 400)
  }
  
  return numAmount
}

export function validateBankAccount(accountNumber: string) {
  // Remove any spaces or special characters
  const cleaned = accountNumber.replace(/[^0-9]/g, '')
  
  if (cleaned.length < 10 || cleaned.length > 16) {
    throw new AppError('Invalid account number length', 400)
  }
  
  return cleaned
}

export function validateEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new AppError('Invalid email format', 400)
  }
  return email.toLowerCase()
}

export function validatePhoneNumber(phone: string) {
  // Remove any non-digit characters
  const cleaned = phone.replace(/[^0-9]/g, '')
  
  if (cleaned.length < 10 || cleaned.length > 15) {
    throw new AppError('Invalid phone number length', 400)
  }
  
  return cleaned
}

export function validateName(name: string) {
  if (!name || name.trim().length < 2) {
    throw new AppError('Name is too short', 400)
  }
  
  if (name.trim().length > 100) {
    throw new AppError('Name is too long', 400)
  }
  
  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  if (!/^[a-zA-Z\s\-']+$/.test(name.trim())) {
    throw new AppError('Name contains invalid characters', 400)
  }
  
  return name.trim()
}

export function validateDescription(description: string | undefined) {
  if (!description) return ''
  
  const trimmed = description.trim()
  if (trimmed.length > 500) {
    throw new AppError('Description is too long (maximum 500 characters)', 400)
  }
  
  return trimmed
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatPhoneNumber(phone: string) {
  const cleaned = phone.replace(/[^0-9]/g, '')
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
  if (match) {
    return '(' + match[1] + ') ' + match[2] + '-' + match[3]
  }
  return phone
}
