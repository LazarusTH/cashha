import { supabase } from './client'

export interface SecurityQuestion {
  id: string
  user_id: string
  question: string
  answer: string
  created_at: string
}

export interface DeviceHistory {
  id: string
  user_id: string
  device_name: string
  device_id: string
  browser: string
  os: string
  ip_address: string
  location: string
  last_active: string
  is_current: boolean
}

export interface LoginAttempt {
  id: string
  user_id: string
  ip_address: string
  location: string
  device_info: string
  success: boolean
  failure_reason?: string
  created_at: string
}

export interface SecurityLog {
  id: string
  user_id: string
  type: string
  details: any
  ip_address: string
  created_at: string
}

export async function getSecurityQuestions(userId: string): Promise<SecurityQuestion[]> {
  const { data, error } = await supabase
    .from('security_questions')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error
  return data || []
}

export async function updateSecurityQuestions(userId: string, questions: {
  question1: string
  answer1: string
  question2: string
  answer2: string
  question3: string
  answer3: string
}): Promise<void> {
  const { error } = await supabase
    .from('security_questions')
    .upsert([
      { user_id: userId, question: questions.question1, answer: questions.answer1 },
      { user_id: userId, question: questions.question2, answer: questions.answer2 },
      { user_id: userId, question: questions.question3, answer: questions.answer3 }
    ])

  if (error) throw error
}

export async function verifySecurityQuestions(userId: string, answers: Record<string, string>): Promise<boolean> {
  const { data, error } = await supabase
    .from('security_questions')
    .select('question, answer')
    .eq('user_id', userId)

  if (error) throw error
  if (!data) return false

  return data.every(q => answers[q.question] === q.answer)
}

export async function getDeviceHistory(userId: string): Promise<DeviceHistory[]> {
  const { data, error } = await supabase
    .from('device_history')
    .select('*')
    .eq('user_id', userId)
    .order('last_active', { ascending: false })

  if (error) throw error
  return data || []
}

export async function logDeviceAccess(userId: string, deviceInfo: Partial<DeviceHistory>): Promise<void> {
  const { error } = await supabase
    .from('device_history')
    .upsert({
      user_id: userId,
      ...deviceInfo,
      last_active: new Date().toISOString()
    })

  if (error) throw error
}

export async function getLoginAttempts(userId: string): Promise<LoginAttempt[]> {
  const { data, error } = await supabase
    .from('login_attempts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) throw error
  return data || []
}

export async function logLoginAttempt(attempt: Partial<LoginAttempt>): Promise<void> {
  const { error } = await supabase
    .from('login_attempts')
    .insert({
      ...attempt,
      created_at: new Date().toISOString()
    })

  if (error) throw error
}

export async function logSecurityUpdate(userId: string, log: { type: string; changes: any }): Promise<void> {
  const { error } = await supabase
    .from('security_logs')
    .insert({
      user_id: userId,
      type: log.type,
      details: log.changes,
      ip_address: await fetch('https://api.ipify.org?format=json').then(r => r.json()).then(data => data.ip),
      created_at: new Date().toISOString()
    })

  if (error) throw error
}

export async function updateSecuritySettings(userId: string, settings: Partial<any>): Promise<void> {
  const response = await fetch('/api/user/account/security', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, settings }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update security settings');
  }
}

export async function getSecurityEvents(userId: string): Promise<any[]> {
  const response = await fetch(`/api/user/account/security/events?userId=${userId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch security events');
  }

  return response.json();
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.api.resetPasswordForEmail(email)
  if (error) throw error
}

export async function updateSecurityPreferences(userId: string, preferences: {
  emailNotifications: boolean
  loginAlerts: boolean
  transactionAlerts: boolean
}): Promise<void> {
  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      ...preferences,
      updated_at: new Date().toISOString()
    })

  if (error) throw error
}

export async function getSecurityLogs(userId: string): Promise<SecurityLog[]> {
  const { data, error } = await supabase
    .from('security_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return data || []
}
