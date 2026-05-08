/**
 * Human-readable patient identifier for UI lists (display only).
 * Format: `Full Name_917976758020` (phone digits only, no spaces).
 */
export function formatPatientDisplayId(
  fullName: string | null | undefined,
  phone: string | null | undefined,
): string {
  const name = (fullName || '').trim().replace(/\s+/g, ' ') || 'Patient'
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits) return `${name}_${digits}`
  return name
}
