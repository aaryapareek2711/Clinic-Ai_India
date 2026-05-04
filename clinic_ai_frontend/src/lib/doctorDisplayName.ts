/** Professional label from signup / profile `full_name` (adds Dr. when missing). */
export function doctorNameLabel(fullName: string): string {
  const n = fullName.trim()
  if (!n) return ''
  const lower = n.toLowerCase()
  if (
    lower.startsWith('dr.') ||
    lower.startsWith('dr ') ||
    lower.startsWith('drc.') ||
    lower.startsWith('prof.') ||
    lower.startsWith('prof ')
  ) {
    return n
  }
  return `Dr. ${n}`
}
