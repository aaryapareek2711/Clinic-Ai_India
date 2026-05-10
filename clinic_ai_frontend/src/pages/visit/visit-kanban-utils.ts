import { formatPatientDisplayId } from '../../lib/patientDisplayId'
import type { ProviderVisitListItem } from '../../services/visitWorkflowApi'
import { isWalkInVisitType } from './intakeUtils'

export type VisitFlowType = 'scheduled' | 'walk-in' | 'unknown'

export type VisitKanbanStage =
  | 'registered'
  | 'appointment-created'
  | 'intake'
  | 'pre-visit'
  | 'vitals'
  | 'transcription'
  | 'clinical-note'
  | 'post-visit-summary'
  | 'recap-completed'

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
  { id: 'registered', title: 'Registered', helper: 'Patient profile created' },
  { id: 'appointment-created', title: 'Appointment / Visit Created', helper: 'Visit generated and ready' },
  { id: 'intake', title: 'Intake', helper: 'Intake pending or in progress' },
  { id: 'pre-visit', title: 'Pre-Visit', helper: 'Pre-visit summary preparation' },
  { id: 'vitals', title: 'Vitals', helper: 'Vitals capture stage' },
  { id: 'transcription', title: 'Transcription', helper: 'Consultation transcript processing' },
  { id: 'clinical-note', title: 'Clinical Note', helper: 'Clinical note generation/review' },
  { id: 'post-visit-summary', title: 'Post Visit Summary', helper: 'Summary generation/review' },
  { id: 'recap-completed', title: 'Recap Sent / Completed', helper: 'Recap sent or visit closed' },
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

  if (['patient_registered', 'registered'].includes(token)) return 'registered'

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
    ['post_visit', 'post_visit_summary', 'post_visit_summary_pending', 'post_summary_in_progress'].includes(token)
  ) {
    return 'post-visit-summary'
  }

  if (['recap_sent', 'post_recap_sent', 'completed', 'closed', 'ended'].includes(token)) return 'recap-completed'

  return null
}

function stageLabel(stage: VisitKanbanStage): string {
  return KANBAN_STAGES.find((s) => s.id === stage)?.title || 'Appointment / Visit Created'
}

function badgeClassForStage(stage: VisitKanbanStage): string {
  if (stage === 'recap-completed') return 'bg-emerald-100 text-emerald-700 border border-emerald-200'
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
  const tokens = collectCandidateTokens(visit)
  for (const token of tokens) {
    if (stageForToken(token)) return token
  }
  const status = norm(visit.status)
  if (status === 'in_progress') return 'vitals'
  return status || 'appointment_created'
}

export function getVisitKanbanStage(visit: ProviderVisitListItem): VisitKanbanStage {
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
  return {
    label: stageLabel(stage),
    className: `inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badgeClassForStage(stage)}`,
  }
}

export function getVisitPrimaryAction(visit: ProviderVisitListItem): VisitPrimaryAction {
  const stage = getVisitKanbanStage(visit)
  const flow = getVisitFlowType(visit)

  if (stage === 'registered') return { label: 'Create Visit', tab: flow === 'walk-in' ? 'vitals' : 'pre-visit' }
  if (stage === 'appointment-created') {
    return { label: flow === 'walk-in' ? 'Start Vitals' : 'Start Intake', tab: flow === 'walk-in' ? 'vitals' : 'pre-visit' }
  }
  if (stage === 'intake') return { label: 'Continue Intake', tab: 'pre-visit' }
  if (stage === 'pre-visit') return { label: 'Generate / View Pre-Visit', tab: 'pre-visit' }
  if (stage === 'vitals') return { label: 'Add / View Vitals', tab: 'vitals' }
  if (stage === 'transcription') return { label: 'Start / Open Transcription', tab: 'transcription' }
  if (stage === 'clinical-note') return { label: 'Generate / View Clinical Note', tab: 'clinical-note' }
  if (stage === 'post-visit-summary') return { label: 'Generate / View Summary', tab: 'post-visit' }
  return { label: 'View Visit', tab: 'post-visit' }
}

export function getVisitTags(visit: ProviderVisitListItem): string[] {
  const tags = new Set<string>()
  const step = getVisitCurrentStep(visit)
  const status = norm(visit.status)
  const stage = getVisitKanbanStage(visit)

  if (step.includes('intake') || stage === 'intake') tags.add('Intake')
  if (step.includes('pre_visit') || stage === 'pre-visit') tags.add('Pre-Visit')
  if (step.includes('vitals') || stage === 'vitals') tags.add('Vitals')
  if (step.includes('transcription') || stage === 'transcription') tags.add('Transcription')
  if (step.includes('clinical_note') || step.includes('soap') || stage === 'clinical-note') tags.add('Clinical Note')
  if (step.includes('post_visit') || step.includes('summary') || stage === 'post-visit-summary') tags.add('Summary')
  if (step.includes('recap') || stage === 'recap-completed') tags.add('Recap')
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

export function groupVisitsByKanbanStage(
  visits: ProviderVisitListItem[],
): Record<VisitKanbanStage, VisitKanbanCardModel[]> {
  const grouped: Record<VisitKanbanStage, VisitKanbanCardModel[]> = {
    registered: [],
    'appointment-created': [],
    intake: [],
    'pre-visit': [],
    vitals: [],
    transcription: [],
    'clinical-note': [],
    'post-visit-summary': [],
    'recap-completed': [],
  }

  for (const visit of visits) {
    const card = toVisitKanbanCardModel(visit)
    grouped[card.stage].push(card)
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
      visit.id,
      visit.mobile_number,
      visit.status,
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
