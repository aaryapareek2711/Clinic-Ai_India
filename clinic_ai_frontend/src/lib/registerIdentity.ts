/**
 * Map signup form fields to API `email` / `username` / `phone`.
 * Phone-only signups use `username` = last 10 digits (allows login with that number).
 */
export function identityForRegister(form: {
  fullName: string
  email: string
  mobile: string
}): { email: string; username: string; phone: string | null } {
  const full = form.fullName.trim()
  if (!full) {
    throw new Error('Full name is required.')
  }
  const digits = form.mobile.replace(/\D/g, '')
  const last10 = digits.length >= 10 ? digits.slice(-10) : ''

  const emailInput = form.email.trim()
  const hasRealEmail = emailInput.includes('@') && emailInput.indexOf('@') > 0

  let email: string
  let username: string

  if (hasRealEmail) {
    email = emailInput.slice(0, 254)
    const local = email.split('@')[0] || ''
    if (local.length >= 3) {
      username = local.slice(0, 64)
    } else if (last10) {
      username = `${local || 'u'}_${last10.slice(-4)}`.slice(0, 64)
    } else {
      const slug = full
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
        .slice(0, 32)
      username = (slug.length >= 3 ? slug : `usr_${Date.now().toString(36)}`).slice(0, 64)
    }
  } else {
    if (!last10) {
      throw new Error('Enter a valid email, or a mobile number with at least 10 digits.')
    }
    email = `${last10}@phone.medgenie.local`
    username = last10
  }

  if (username.length < 3) {
    username = last10 ? `u${last10.slice(-9)}` : `usr_${Date.now().toString(36)}`
  }

  const phone = last10 ? (digits.length > 10 && digits.startsWith('91') ? digits.slice(0, 30) : `91${last10}`) : null

  return {
    email,
    username: username.slice(0, 64),
    phone,
  }
}
