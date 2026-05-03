import { apiClient, getApiErrorMessage } from '../lib/apiClient'

export type ProviderProfile = {
  id: string
  email: string
  username: string
  full_name: string
  phone?: string | null
  role: string
  job_title?: string | null
  medical_license_number?: string | null
  avatar_url?: string | null
  is_active: boolean
  is_verified: boolean
  tenant_id?: string | null
}

export type ProviderProfilePatch = Partial<{
  full_name: string
  phone: string
  job_title: string
  medical_license_number: string
  avatar_url: string
}>

function authHeaders(): Record<string, string> {
  const token =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('access_token') ?? localStorage.getItem('token')
      : null
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export async function fetchMyProfile(): Promise<ProviderProfile> {
  const { data } = await apiClient.get<ProviderProfile>('/api/auth/me', {
    headers: authHeaders(),
  })
  return data
}

export async function patchMyProfile(body: ProviderProfilePatch): Promise<ProviderProfile> {
  const { data } = await apiClient.patch<ProviderProfile>('/api/auth/me', body, {
    headers: authHeaders(),
  })
  return data
}

export { getApiErrorMessage }
