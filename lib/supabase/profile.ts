import { supabase } from './client'

export type ProfileData = {
  id: string
  email: string
  firstName: string
  lastName: string
  phoneNumber: string
  dateOfBirth: string
  nationality: string
  address: string
  role: 'user' | 'admin'
  idCardUrl: string
  proofOfAddressUrl: string
  referralCode?: string
  status: 'pending_verification' | 'verified' | 'rejected'
  createdAt: string
}

export async function createProfile(profileData: ProfileData) {
  const { data, error } = await supabase
    .from('profiles')
    .insert([
      {
        id: profileData.id,
        email: profileData.email,
        full_name: `${profileData.firstName} ${profileData.lastName}`,
        role: profileData.role,
        phoneNumber: profileData.phoneNumber,
        dateOfBirth: profileData.dateOfBirth,
        nationality: profileData.nationality,
        address: profileData.address,
        idCardUrl: profileData.idCardUrl,
        proofOfAddressUrl: profileData.proofOfAddressUrl,
        referralCode: profileData.referralCode,
        status: profileData.status,
        createdAt: profileData.createdAt,
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
      ...(updates.phoneNumber && { phoneNumber: updates.phoneNumber }),
      ...(updates.dateOfBirth && { dateOfBirth: updates.dateOfBirth }),
      ...(updates.nationality && { nationality: updates.nationality }),
      ...(updates.address && { address: updates.address }),
      ...(updates.role && { role: updates.role }),
      ...(updates.idCardUrl && { idCardUrl: updates.idCardUrl }),
      ...(updates.proofOfAddressUrl && { proofOfAddressUrl: updates.proofOfAddressUrl }),
      ...(updates.referralCode && { referralCode: updates.referralCode }),
      ...(updates.status && { status: updates.status }),
      ...(updates.createdAt && { createdAt: updates.createdAt }),
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}
