export const SELECTED_CLINICAL_TEMPLATE_KEY = 'selected_clinical_template'

export type SelectedClinicalTemplate = {
  id: string
  name: string
}

export function getSelectedClinicalTemplate(): SelectedClinicalTemplate | null {
  try {
    const raw = localStorage.getItem(SELECTED_CLINICAL_TEMPLATE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { id?: unknown; name?: unknown }
    const id = typeof parsed.id === 'string' ? parsed.id.trim() : ''
    const name = typeof parsed.name === 'string' ? parsed.name.trim() : ''
    if (!id) return null
    return { id, name: name || 'Template' }
  } catch {
    return null
  }
}

export function setSelectedClinicalTemplate(template: SelectedClinicalTemplate): void {
  try {
    localStorage.setItem(SELECTED_CLINICAL_TEMPLATE_KEY, JSON.stringify(template))
  } catch {
    /* ignore */
  }
}

export function clearSelectedClinicalTemplate(): void {
  try {
    localStorage.removeItem(SELECTED_CLINICAL_TEMPLATE_KEY)
  } catch {
    /* ignore */
  }
}

