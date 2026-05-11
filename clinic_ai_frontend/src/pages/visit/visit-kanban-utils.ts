import { formatPatientDisplayId } from '../../lib/patientDisplayId'
import type { ProviderVisitListItem } from '../../services/visitWorkflowApi'
import { isWalkInVisitType } from './intakeUtils'

export type VisitFlowType = 'scheduled' | 'walk-in' | 'unknown'

export type VisitKanbanStage =
  | 'appointment-created'
  | 'intake'
  | 'pre-visit'
  | 'vitals'
  | 'transcription'
  | 'clinical-note'
  | 'post-visit-summary'

/** Same values as Visits page sort dropdown — used for client-side column ordering. */
export type VisitKanbanSortKey =
  | 'patient_newest'
  | 'patient_oldest'
  | 'visit_latest'
  | 'visit_oldest'
  | 'time_newest'
  | 'time_oldest'
  | 'name_az'
  | 'name_za'
  | 'visit_id'

/** `all` = apply selected sort inside every column; otherwise only that column is re-ordered. */
export type VisitKanbanSortScope = 'all' | VisitKanbanStage | VisitKanbanStage[]

export type VisitPrimaryAction = {
  label: string
  tab: 'pre-visit' | 'vitals' | 'transcription' | 'clinical-note' | 'post-visit'
}

export type VisitStageBadge = {
  label: string
  className: string
}

export type KanbanStageDefinition = {
  id: VisitKanbanStage
  title: string
  helper: string
}

export type VisitKanbanCardModel = {
  visitId: string
  patientId: string
  patientName: string
  subtitle: string
  meta: string
  flowType: VisitFlowType
  stage: VisitKanbanStage
  currentStep: string
  stageBadge: VisitStageBadge
  primaryAction: VisitPrimaryAction
  tags: string[]
  scheduledStart: string
}

export const KANBAN_STAGES: KanbanStageDefinition[] = [
  { id: 'appointment-created', title: 'Appointment / Visit Created', helper: 'Visit generated and ready' },
  { id: 'intake', title: 'Intake', helper: 'Intake pending or in progress' },
  { id: 'pre-visit', title: 'Pre-Visit', helper: 'Pre-visit summary preparation' },
  { id: 'vitals', title: 'Vitals', helper: 'Vitals capture stage' },
  { id: 'transcription', title: 'Transcription', helper: 'Consultation transcript processing' },
  { id: 'clinical-note', title: 'Clinical Note', helper: 'Clinical note generation/review' },
  {
    id: 'post-visit-summary',
    title: 'Post Visit Summary / Completed',
    helper: 'Summary & recap work, or visit fully closed',
  },
]

function norm(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

function toDisplayName(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(' ')
}

function titleCaseToken(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function stageForToken(token: string): VisitKanbanStage | null {
  if (!token) return null

  if (['patient_registered', 'registered'].includes(token)) return 'appointment-created'

  if (
    [
      'scheduled',
      'upcoming',
      'appointment_fixed',
      'appointment_created',
      'visit_created',
      'visit_generated',
      'open',
      'queued',
      'in_queue',
      'appointment',
    ].includes(token)
  ) {
    return 'appointment-created'
  }

  if (['intake', 'intake_pending', 'intake_in_progress', 'not_started'].includes(token)) return 'intake'

  if (['pre_visit', 'previsit', 'pre_visit_pending', 'previsit_pending', 'pre_visit_in_progress', 'previsit_in_progress'].includes(token)) {
    return 'pre-visit'
  }

  if (['vitals', 'vitals_pending', 'vitals_in_progress'].includes(token)) return 'vitals'

  if (['transcription', 'transcription_pending', 'transcription_in_progress', 'processing'].includes(token)) {
    return 'transcription'
  }

  if (
    [
      'clinical_note',
      'clinical_note_pending',
      'clinical_note_in_progress',
      'soap_pending',
      'soap',
      'opd_note',
    ].includes(token)
  ) {
    return 'clinical-note'
  }

  if (
    [
      'post_visit',
      'post_visit_summary',
      'post_visit_summary_pending',
      'post_summary_in_progress',
      'recap_sent',
      'post_recap_sent',
      'recap_delivered',
      'whatsapp_sent',
      'completed',
      'complete',
      'closed',
      'ended',
    ].includes(token)
  ) {
    return 'post-visit-summary'
  }

  return null
}

function stageLabel(stage: VisitKanbanStage): string {
  return KANBAN_STAGES.find((s) => s.id === stage)?.title || 'Appointment / Visit Created'
}

function badgeClassForStage(stage: VisitKanbanStage): string {
  if (stage === 'appointment-created' || stage === 'intake' || stage === 'pre-visit') {
    return 'bg-amber-100 text-amber-700 border border-amber-200'
  }
  if (stage === 'transcription' || stage === 'clinical-note') {
    return 'bg-violet-100 text-violet-700 border border-violet-200'
  }
  return 'bg-blue-100 text-blue-700 border border-blue-200'
}

function collectCandidateTokens(visit: ProviderVisitListItem): string[] {
  const extra = visit as ProviderVisitListItem & {
    workflow_step?: string | null
    current_step?: string | null
    stage?: string | null
  }
  return [
    extra.workflow_step,
    extra.current_step,
    extra.stage,
    visit.current_workflow_stage,
    visit.next_workflow_stage,
    visit.previous_workflow_stage,
    visit.intake_status,
    visit.status,
  ]
    .map((v) => norm(v))
    .filter(Boolean)
}

/** When true, visit belongs in Transcription column even if current_workflow_stage is still vitals. */
function transcriptionStageOverride(visit: ProviderVisitListItem): VisitKanbanStage | null {
  const ts = norm(visit.transcription_status)
  if (['queued', 'uploading', 'processing', 'stale_processing'].includes(ts)) return 'transcription'
  if (ts === 'failed') return 'transcription'
  return null
}

/**
 * Backend often leaves `current_workflow_stage` on `vitals` while `transcription_status` is already
 * `completed` (workflow advances on a different cadence). Until stage moves to clinical note or later,
 * show the visit under Transcription so the board matches reality.
 */
function completedTranscriptionStageOverride(visit: ProviderVisitListItem): VisitKanbanStage | null {
  if (norm(visit.transcription_status) !== 'completed') return null
  const wf = norm(visit.current_workflow_stage)
  if (['clinical_note', 'post_visit', 'completed', 'cancelled', 'no_show'].includes(wf)) return null
  if (wf === 'vitals' || wf === 'transcription' || wf === '') return 'transcription'
  return null
}

export function getVisitFlowType(visit: ProviderVisitListItem): VisitFlowType {
  const rawType = norm(visit.visit_type)
  if (isWalkInVisitType(rawType)) return 'walk-in'
  if (rawType.includes('scheduled')) return 'scheduled'

  const tokens = collectCandidateTokens(visit)
  if (tokens.includes('patient_registered') && tokens.includes('next_vitals')) return 'walk-in'
  if (tokens.includes('intake') || tokens.includes('pre_visit')) return 'scheduled'
  return 'unknown'
}

export function getVisitCurrentStep(visit: ProviderVisitListItem): string {
  const ts = norm(visit.transcription_status)
  if (['queued', 'uploading', 'processing', 'stale_processing', 'failed'].includes(ts)) return `transcription_${ts}`
  if (ts === 'completed' && completedTranscriptionStageOverride(visit)) return 'transcription_completed'

  const tokens = collectCandidateTokens(visit)
  for (const token of tokens) {
    if (stageForToken(token)) return token
  }
  const status = norm(visit.status)
  if (status === 'in_progress') return 'vitals'
  return status || 'appointment_created'
}

export function getVisitKanbanStage(visit: ProviderVisitListItem): VisitKanbanStage {
  const fromTranscription = transcriptionStageOverride(visit)
  if (fromTranscription) return fromTranscription

  const fromCompletedTranscription = completedTranscriptionStageOverride(visit)
  if (fromCompletedTranscription) return fromCompletedTranscription

  const statusEarly = norm(visit.status)
  if (['completed', 'complete', 'closed', 'ended'].includes(statusEarly)) return 'post-visit-summary'

  const explicit = collectCandidateTokens(visit)
  for (const token of explicit) {
    const mapped = stageForToken(token)
    if (mapped) return mapped
  }

  const status = norm(visit.status)
  if (status === 'in_progress') return 'vitals'
  if (status === 'no_show' || status === 'cancelled') return 'appointment-created'

  return 'appointment-created'
}

export function getVisitStageBadge(visit: ProviderVisitListItem): VisitStageBadge {
  const stage = getVisitKanbanStage(visit)
  const st = norm(visit.status)
  const terminal = ['completed', 'complete', 'closed', 'ended'].includes(st)
  let label = stageLabel(stage)
  let toneClass = badgeClassForStage(stage)
  if (stage === 'post-visit-summary') {
    label = terminal ? 'Completed' : 'Post visit summary'
    if (terminal) toneClass = 'bg-emerald-100 text-emerald-700 border border-emerald-200'
  }
  return {
    label,
    className: `inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${toneClass}`,
  }
}

export function getVisitPrimaryAction(visit: ProviderVisitListItem): VisitPrimaryAction {
  const stage = getVisitKanbanStage(visit)
  const flow = getVisitFlowType(visit)

  if (stage === 'appointment-created') {
    return { label: flow === 'walk-in' ? 'Start Vitals' : 'Start Intake', tab: flow === 'walk-in' ? 'vitals' : 'pre-visit' }
  }
  if (stage === 'intake') return { label: 'Continue Intake', tab: 'pre-visit' }
  if (stage === 'pre-visit') return { label: 'Generate / View Pre-Visit', tab: 'pre-visit' }
  if (stage === 'vitals') return { label: 'Add / View Vitals', tab: 'vitals' }
  if (stage === 'transcription') {
    const ts = norm(visit.transcription_status)
    if (ts === 'completed') return { label: 'Review Transcription', tab: 'transcription' }
    return { label: 'Start / Open Transcription', tab: 'transcription' }
  }
  if (stage === 'clinical-note') return { label: 'Generate / View Clinical Note', tab: 'clinical-note' }
  if (stage === 'post-visit-summary') {
    const st = norm(visit.status)
    if (['completed', 'complete', 'closed', 'ended'].includes(st)) return { label: 'View Visit', tab: 'post-visit' }
    return { label: 'Generate / View Summary', tab: 'post-visit' }
  }
  return { label: 'View Visit', tab: 'post-visit' }
}

export function getVisitTags(visit: ProviderVisitListItem): string[] {
  const tags = new Set<string>()
  const step = getVisitCurrentStep(visit)
  const status = norm(visit.status)
  const stage = getVisitKanbanStage(visit)
  const tx = norm(visit.transcription_status)

  if (['queued', 'uploading', 'processing', 'stale_processing'].includes(tx)) tags.add('Transcription')
  if (tx === 'failed') tags.add('Transcription')
  if (tx === 'completed' && completedTranscriptionStageOverride(visit)) tags.add('Transcript ready')

  if (step.includes('intake') || stage === 'intake') tags.add('Intake')
  if (step.includes('pre_visit') || stage === 'pre-visit') tags.add('Pre-Visit')
  if (step.includes('vitals') || stage === 'vitals') tags.add('Vitals')
  if (step.includes('transcription') || stage === 'transcription') tags.add('Transcription')
  if (step.includes('clinical_note') || step.includes('soap') || stage === 'clinical-note') tags.add('Clinical Note')
  if (step.includes('post_visit') || step.includes('summary') || stage === 'post-visit-summary') tags.add('Summary')
  if (step.includes('recap') || (stage === 'post-visit-summary' && ['completed', 'complete', 'closed', 'ended'].includes(status)))
    tags.add('Recap')
  if (status === 'queued' || status === 'in_queue') tags.add('Queue')

  if (tags.size === 0) tags.add(stageLabel(stage))
  return Array.from(tags).slice(0, 3)
}

export function toVisitKanbanCardModel(visit: ProviderVisitListItem): VisitKanbanCardModel {
  const displayName = toDisplayName(visit.patient_name || '') || 'Patient'
  const subtitle =
    visit.visit_type && visit.visit_type.trim() && visit.visit_type.toLowerCase() !== 'visit'
      ? visit.visit_type.trim()
      : visit.chief_complaint?.trim() || 'Consultation'
  const flowType = getVisitFlowType(visit)
  const stage = getVisitKanbanStage(visit)
  const currentStep = getVisitCurrentStep(visit)
  const stageBadge = getVisitStageBadge(visit)
  const primaryAction = getVisitPrimaryAction(visit)
  const tags = getVisitTags(visit)

  return {
    visitId: (visit.visit_id || visit.id || '').trim(),
    patientId: (visit.patient_id || '').trim(),
    patientName: displayName,
    subtitle,
    meta: formatPatientDisplayId(displayName, visit.mobile_number),
    flowType,
    stage,
    currentStep,
    stageBadge,
    primaryAction,
    tags,
    scheduledStart: visit.scheduled_start || '',
  }
}

function parseSortTime(value: string | null | undefined): number {
  const raw = String(value || '').trim()
  if (!raw) return NaN
  const t = Date.parse(raw)
  return Number.isFinite(t) ? t : NaN
}

/** Client-side ordering so Kanban columns respect the same sort intent as the visits API. */
export function compareVisitsForSort(a: ProviderVisitListItem, b: ProviderVisitListItem, sortBy: VisitKanbanSortKey): number {
  const nameA = (a.patient_name || '').toLowerCase()
  const nameB = (b.patient_name || '').toLowerCase()
  const idA = (a.visit_id || a.id || '').toLowerCase()
  const idB = (b.visit_id || b.id || '').toLowerCase()

  switch (sortBy) {
    case 'name_az':
      return nameA.localeCompare(nameB)
    case 'name_za':
      return nameB.localeCompare(nameA)
    case 'visit_id':
      return idA.localeCompare(idB)
    case 'patient_newest': {
      const ta = parseSortTime(a.patient_created_at)
      const tb = parseSortTime(b.patient_created_at)
      const aOk = Number.isFinite(ta)
      const bOk = Number.isFinite(tb)
      if (aOk && bOk && ta !== tb) return tb - ta
      if (aOk !== bOk) return aOk ? -1 : 1
      return idB.localeCompare(idA)
    }
    case 'patient_oldest': {
      const ta = parseSortTime(a.patient_created_at)
      const tb = parseSortTime(b.patient_created_at)
      const aOk = Number.isFinite(ta)
      const bOk = Number.isFinite(tb)
      if (aOk && bOk && ta !== tb) return ta - tb
      if (aOk !== bOk) return aOk ? -1 : 1
      return idA.localeCompare(idB)
    }
    case 'visit_latest': {
      const ta = parseSortTime(a.patient_last_visit_at)
      const tb = parseSortTime(b.patient_last_visit_at)
      const aOk = Number.isFinite(ta)
      const bOk = Number.isFinite(tb)
      if (aOk && bOk && ta !== tb) return tb - ta
      if (aOk !== bOk) return aOk ? -1 : 1
      return idB.localeCompare(idA)
    }
    case 'visit_oldest': {
      const ta = parseSortTime(a.patient_last_visit_at)
      const tb = parseSortTime(b.patient_last_visit_at)
      const aOk = Number.isFinite(ta)
      const bOk = Number.isFinite(tb)
      if (aOk && bOk && ta !== tb) return ta - tb
      if (aOk !== bOk) return aOk ? -1 : 1
      return idA.localeCompare(idB)
    }
    case 'time_newest': {
      const ta = parseSortTime(a.scheduled_start || undefined) || parseSortTime(a.created_at)
      const tb = parseSortTime(b.scheduled_start || undefined) || parseSortTime(b.created_at)
      const aOk = Number.isFinite(ta)
      const bOk = Number.isFinite(tb)
      if (aOk && bOk && ta !== tb) return tb - ta
      if (aOk !== bOk) return aOk ? -1 : 1
      return idB.localeCompare(idA)
    }
    case 'time_oldest': {
      const ta = parseSortTime(a.scheduled_start || undefined) || parseSortTime(a.created_at)
      const tb = parseSortTime(b.scheduled_start || undefined) || parseSortTime(b.created_at)
      const aOk = Number.isFinite(ta)
      const bOk = Number.isFinite(tb)
      if (aOk && bOk && ta !== tb) return ta - tb
      if (aOk !== bOk) return aOk ? -1 : 1
      return idA.localeCompare(idB)
    }
    default:
      return 0
  }
}

function emptyGroupedVisits(): Record<VisitKanbanStage, ProviderVisitListItem[]> {
  return {
    'appointment-created': [],
    intake: [],
    'pre-visit': [],
    vitals: [],
    transcription: [],
    'clinical-note': [],
    'post-visit-summary': [],
  }
}

export function groupVisitRowsByKanbanStage(visits: ProviderVisitListItem[]): Record<VisitKanbanStage, ProviderVisitListItem[]> {
  const grouped = emptyGroupedVisits()
  for (const visit of visits) {
    const stage = getVisitKanbanStage(visit)
    grouped[stage].push(visit)
  }
  return grouped
}

export function applyKanbanColumnSort(
  grouped: Record<VisitKanbanStage, ProviderVisitListItem[]>,
  sortBy: VisitKanbanSortKey,
  sortScope: VisitKanbanSortScope,
): Record<VisitKanbanStage, ProviderVisitListItem[]> {
  const scopes =
    sortScope === 'all'
      ? 'all'
      : Array.isArray(sortScope)
        ? new Set(sortScope)
        : new Set([sortScope])
  const out = emptyGroupedVisits()
  ;(Object.keys(grouped) as VisitKanbanStage[]).forEach((stage) => {
    const bucket = [...(grouped[stage] || [])]
    if (scopes === 'all' || scopes.has(stage)) {
      bucket.sort((a, b) => compareVisitsForSort(a, b, sortBy))
    }
    out[stage] = bucket
  })
  return out
}

export function groupVisitsByKanbanStage(
  visits: ProviderVisitListItem[],
  sortBy: VisitKanbanSortKey = 'patient_newest',
  sortScope: VisitKanbanSortScope = 'all',
): Record<VisitKanbanStage, VisitKanbanCardModel[]> {
  const rawGrouped = groupVisitRowsByKanbanStage(visits)
  const sortedGrouped = applyKanbanColumnSort(rawGrouped, sortBy, sortScope)
  const grouped: Record<VisitKanbanStage, VisitKanbanCardModel[]> = {
    'appointment-created': [],
    intake: [],
    'pre-visit': [],
    vitals: [],
    transcription: [],
    'clinical-note': [],
    'post-visit-summary': [],
  }

  for (const stage of Object.keys(grouped) as VisitKanbanStage[]) {
    grouped[stage] = sortedGrouped[stage].map((v) => toVisitKanbanCardModel(v))
  }
  return grouped
}

export function filterVisitsBySearch(visits: ProviderVisitListItem[], searchTerm: string): ProviderVisitListItem[] {
  const q = (searchTerm || '').trim().toLowerCase()
  if (!q) return visits
  return visits.filter((visit) => {
    const step = getVisitCurrentStep(visit)
    const stage = getVisitKanbanStage(visit)
    const haystack = [
      visit.patient_name,
      visit.visit_id,
      visit.patient_id,
      visit.id,
      visit.mobile_number,
      visit.status,
      visit.transcription_status,
      visit.visit_type,
      visit.chief_complaint,
      step,
      stageLabel(stage),
      titleCaseToken(step),
    ]
      .map((v) => String(v || '').toLowerCase())
      .join(' ')
    return haystack.includes(q)
  })
}
