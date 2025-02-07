import { supabase } from './client'

export type ProfileData = {
  id: string
  email: string
  firstName: string
  lastName: string
  role?: 'user' | 'admin'
}

export async function createProfile(profileData: ProfileData) {
  const { data, error } = await supabase
    .from('profiles')
    .insert([
      {
        id: profileData.id,
        email: profileData.email,
        full_name: `${profileData.firstName} ${profileData.lastName}`,
        role: profileData.role || 'user',
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

export async function updateProfile(userId: string, updates: Partial<ProfileData>) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...(updates.email && { email: updates.email }),
      ...(updates.firstName && updates.lastName && {
        full_name: `${updates.firstName} ${updates.lastName}`,
      }),
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}
