import type { IntakeSessionResponse } from '../../services/visitWorkflowApi'

export function languageLabel(code: string): string {
  const c = (code || 'en').toLowerCase()
  if (c.startsWith('hi')) return 'Hindi'
  if (c.startsWith('en')) return 'English'
  return code
}

export function splitToChips(text: string, minLen = 2): string[] {
  const t = (text || '').trim()
  if (!t || t === 'Not provided') return []
  return t
    .split(/[,;]|\n/)
    .map((s) => s.trim())
    .filter((s) => s.length >= minLen)
}

export function computeIntakeProgress(intake: IntakeSessionResponse | null): {
  pct: number
  steps: { label: string; done: boolean }[]
} {
  if (!intake) {
    return {
      pct: 0,
      steps: [
        { label: 'Personal Info', done: false },
        { label: 'Symptoms Log', done: false },
        { label: 'Medication Review', done: false },
        { label: 'Consent Forms', done: false },
      ],
    }
  }
  const s = (intake.status || '').toLowerCase()
  const n = intake.question_answers?.length ?? 0
  const hasIllness = Boolean((intake.illness || '').trim())
  const hasMedsTopic = intake.question_answers?.some(
    (x) => /medicine|medication|drug|remedy/i.test(x.question || '') || /medicine|medication/i.test(x.topic || ''),
  )

  const steps = [
    { label: 'Personal Info', done: n > 0 || hasIllness },
    { label: 'Symptoms Log', done: hasIllness || n >= 2 },
    { label: 'Medication Review', done: hasMedsTopic || n >= 3 },
    { label: 'Consent Forms', done: s === 'completed' || s === 'stopped' },
  ]
  const doneCount = steps.filter((x) => x.done).length
  let pct = Math.round((doneCount / steps.length) * 100)
  if (s === 'completed' || s === 'stopped') pct = 100
  else if (s === 'not_started') pct = Math.min(pct, 15)
  return { pct, steps }
}

export function topicHeading(topic: string | null | undefined, fallback: string): string {
  const t = (topic || '').trim()
  if (!t) return fallback
  return t.replace(/_/g, ' ')
}
