import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '',
})

export type RequestOtpResponse = {
  message: string
}

export type VerifyOtpResponse = {
  message: string
  reset_token: string
}

export async function requestForgotPasswordOtp(identifier: string): Promise<RequestOtpResponse> {
  const { data } = await api.post<RequestOtpResponse>('/api/auth/forgot-password/request-otp', {
    identifier,
  })
  return data
}

export async function verifyForgotPasswordOtp(
  identifier: string,
  otp: string,
): Promise<VerifyOtpResponse> {
  const { data } = await api.post<VerifyOtpResponse>('/api/auth/forgot-password/verify-otp', {
    identifier,
    otp,
  })
  return data
}
