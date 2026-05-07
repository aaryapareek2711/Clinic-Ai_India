import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { useProviderIdentity } from '../hooks/useProviderIdentity'
import { getApiErrorMessage } from '../lib/apiClient'
import {
  fetchLatestPostVisitSummary,
  fetchLatestVitalsForVisit,
  fetchTranscriptionStatus,
  fetchVisitDetail,
  fetchVisitWorkspaceSummary,
  fetchVisitTranscriptionDialogue,
  translateDisplayPayload,
  structureVisitDialogue,
  generatePostVisitSummary,
  generateVitalsForm,
  sendPostVisitSummaryWhatsApp,
  scheduleVisitIntake,
  type PostVisitPatientLanguage,
  submitVitals,
  createLabRecordText,
  uploadLabRecordWithImages,
  uploadTranscriptionAudio,
  type ClinicalNoteLatest,
  type IntakeSessionResponse,
  type PostVisitSummaryResponse,
  type PreVisitSummaryResponse,
  type TranscriptionStatusResponse,
  type VisitDetailResponse,
  type VitalsFormResponse,
} from '../services/visitWorkflowApi'
import NotificationsDrawer from './NotificationsDrawer'
import { isWalkInVisitType, languageLabel } from './visit/intakeUtils'
import VisitClinicalNotePanel from './visit/VisitClinicalNotePanel'
import VisitIntakeCanvas, { patientPortraitSrc } from './visit/VisitIntakeCanvas'

export type VisitWorkflowTab = 'pre-visit' | 'vitals' | 'transcription' | 'clinical-note' | 'post-visit'

const TAB_ORDER: VisitWorkflowTab[] = ['pre-visit', 'vitals', 'transcription', 'clinical-note', 'post-visit']

/** Older URLs map into the 5-step workflow */
const LEGACY_TAB_MAP: Record<string, VisitWorkflowTab> = {
  intake: 'pre-visit',
  'opd-note': 'clinical-note',
  whatsapp: 'post-visit',
}

const DR_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCuSkfvIW3phx7yHbt104mLhs656BoGQpYY09pPg3wUO_G9c3DWXj7ry68ypMznP1rTdyAPSXjX6Xk7cDbvJ1wgmWIlq_McPQW-9KpGS9qeEbJVVjt4YVfbIWGE8WyTOLE1nlg7wDw7fKdH7x-kMASiUT_StwHliRrFojXgKNfKBB79rNiWPg8DfC3FAxKDCDvu0pyNjmXjRMaDTqqlXXqHwQuQtOnhf_uKw2ti2h8FznKYlsSlVV4VYJ3tst3kLqJ3Qx1OO_BNWviI'

const LAB_UPLOAD_MAX_BYTES = 10 * 1024 * 1024
const LAB_UPLOAD_MAX_FILES = 8

const LAB_TEST_CATEGORY_OPTIONS = [
  '',
  'Blood Work',
  'Imaging (X-Ray/MRI)',
  'Cardiology',
  'Pathology',
  'Genetic Testing',
  'Other',
] as const

function ageFromDob(dob: string | undefined): string {
  if (!dob) return '—'
  const y = new Date(dob).getFullYear()
  if (Number.isNaN(y) || y < 1900) return '—'
  return `${new Date().getFullYear() - y}`
}

function localDateInputMin(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function normalizeWorkflowTab(raw: string): VisitWorkflowTab {
  const mapped = LEGACY_TAB_MAP[raw]
  if (mapped) return mapped
  if (TAB_ORDER.includes(raw as VisitWorkflowTab)) return raw as VisitWorkflowTab
  return 'vitals'
}

function isTemperatureCelsiusField(key: string, unit?: string | null): boolean {
  const k = (key || '').toLowerCase()
  const u = (unit || '').toLowerCase()
  return k.includes('temperature_c') || (k.includes('temperature') && u.includes('c'))
}

function toCelsiusFromFahrenheit(raw: string): string {
  const n = Number(raw)
  if (!Number.isFinite(n)) return raw
  const c = ((n - 32) * 5) / 9
  return (Math.round(c * 10) / 10).toString()
}

function digitsOnlyPhone(raw: string): string {
  return raw.replace(/\D/g, '').trim()
}

function formatIndiaWhatsAppDisplay(digits: string): string {
  const d = digitsOnlyPhone(digits)
  if (d.length >= 10) {
    const last10 = d.slice(-10)
    return `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`
  }
  return digits.trim() || '—'
}

function resolvePreferredLanguageCode(
  intakeLanguage: string | null | undefined,
  preVisitLanguage: string | null | undefined,
): string {
  const preferred = [intakeLanguage, preVisitLanguage]
    .map((v) => (v || '').trim())
    .find((v) => v.length > 0 && v.toLowerCase() !== 'null' && v.toLowerCase() !== 'none')
  return preferred || 'en'
}

function toPostVisitPatientLanguage(languageCode: string): PostVisitPatientLanguage {
  const c = (languageCode || '').trim().toLowerCase().replace(/_/g, '-')
  if (c === 'hi-eng') return 'hi-eng'
  if (c.startsWith('hi')) return 'hi'
  return 'en'
}

function to12HourTimeDisplay(raw: string | null | undefined): string {
  const text = String(raw || '').trim()
  if (!text) return ''
  const m12 = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (m12) {
    const hh = Number(m12[1])
    const mm = m12[2]
    const mer = m12[3].toUpperCase()
    if (hh >= 1 && hh <= 12) return `${hh}:${mm} ${mer}`
  }
  const m24 = text.match(/^(\d{1,2}):(\d{2})$/)
  if (!m24) return text
  const h = Number(m24[1])
  const mm = m24[2]
  if (!Number.isFinite(h) || h < 0 || h > 23) return text
  const mer = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${mm} ${mer}`
}

function to24HourTimeForApi(raw: string | null | undefined): string {
  const text = String(raw || '').trim()
  if (!text) return ''
  const m12 = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (m12) {
    const h12 = Number(m12[1])
    const mm = Number(m12[2])
    const mer = m12[3].toUpperCase()
    if (h12 >= 1 && h12 <= 12 && mm >= 0 && mm <= 59) {
      const h24 = (h12 % 12) + (mer === 'PM' ? 12 : 0)
      return `${String(h24).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
    }
  }
  return text
}

function parse12HourTimeParts(raw: string | null | undefined): { hour: string; minute: string; period: string } {
  const text = to12HourTimeDisplay(raw)
  const m = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!m) return { hour: '', minute: '', period: '' }
  return {
    hour: String(Number(m[1])).padStart(2, '0'),
    minute: m[2],
    period: m[3].toUpperCase(),
  }
}

function compose12HourTime(parts: { hour: string; minute: string; period: string }): string {
  if (!parts.hour || !parts.minute || !parts.period) return ''
  const hh = Number(parts.hour)
  const mm = Number(parts.minute)
  const pp = parts.period.toUpperCase()
  if (!(hh >= 1 && hh <= 12 && mm >= 0 && mm <= 59 && (pp === 'AM' || pp === 'PM'))) return ''
  return `${hh}:${String(mm).padStart(2, '0')} ${pp}`
}

const HOUR_OPTIONS_12H = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  return ''
}

function formatRecordingElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/** Pre-visit step is aimed at visits that have a scheduled slot (board-style workflow). */
function showScheduledPreVisitBadge(v: VisitDetailResponse | null): boolean {
  if (!v?.scheduled_start) return false
  const s = (v.status || '').toLowerCase()
  return ['scheduled', 'open', 'queued', 'in_queue', 'in_progress'].includes(s)
}

function visitStatusChip(statusRaw: string | undefined | null): {
  label: string
  className: string
} {
  const s = (statusRaw || '').trim().toLowerCase()
  if (['scheduled', 'open', 'queued', 'in_queue'].includes(s)) {
    return {
      label: 'Scheduled',
      className: 'rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800',
    }
  }
  if (['in_progress', 'running', 'started', 'processing'].includes(s)) {
    return {
      label: 'In Progress',
      className: 'rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-semibold text-sky-800',
    }
  }
  if (['completed', 'closed', 'ended'].includes(s)) {
    return {
      label: 'Completed',
      className: 'rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800',
    }
  }
  const fallback = s ? `${s[0].toUpperCase()}${s.slice(1).replace(/_/g, ' ')}` : 'Unknown'
  return {
    label: fallback,
    className: 'rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-white',
  }
}

function transcriptionStatusUiMessage(
  statusRaw: string | undefined | null,
  backendMessage: string | null | undefined,
): string {
  const status = (statusRaw || '').trim().toLowerCase()
  const msg = (backendMessage || '').trim()

  if (status === 'completed') return msg || 'Transcription completed.'
  if (status === 'failed') return msg || 'Transcription failed.'
  if (status === 'queued' || status === 'uploading') return msg || 'Transcription queued.'
  if (
    status === 'processing' ||
    status === 'in_progress' ||
    status === 'running' ||
    status === 'started' ||
    status === 'stale_processing'
  ) {
    return msg || 'Transcription in progress.'
  }
  if (status === 'pending') return msg || 'Transcription not started.'
  return msg || status || 'Transcription status unavailable.'
}

function transcriptionStatusUiLabel(
  statusRaw: string | undefined | null,
  _backendMessage: string | null | undefined,
): string {
  const status = (statusRaw || '').trim().toLowerCase()
  if (status === 'queued' || status === 'uploading') return 'Queued'
  if (
    status === 'processing' ||
    status === 'in_progress' ||
    status === 'running' ||
    status === 'started' ||
    status === 'stale_processing'
  )
    return 'Processing'
  if (status === 'pending') return 'Pending'
  if (status === 'completed') return 'Completed'
  if (status === 'failed') return 'Failed'
  if (!status) return 'Unknown'
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** GET dialogue returns `structured_dialogue` as `{ Doctor?: string, Patient?: string }[]` (one key per turn). */
function flattenStructuredDialogue(
  turns: Array<Record<string, unknown>> | null | undefined,
): { role: string; text: string }[] {
  if (!Array.isArray(turns) || turns.length === 0) return []
  const out: { role: string; text: string }[] = []
  for (const turn of turns) {
    if (!turn || typeof turn !== 'object') continue
    for (const [role, raw] of Object.entries(turn)) {
      const text = typeof raw === 'string' ? raw.trim() : raw != null ? String(raw).trim() : ''
      if (role && text) out.push({ role, text })
    }
  }
  return out
}

export default function VisitDetailPage() {
  const navigate = useNavigate()
  const provider = useProviderIdentity()
  const [searchParams, setSearchParams] = useSearchParams()
  const visitId = searchParams.get('visitId')?.trim() ?? ''
  const tabParamRaw = searchParams.get('tab')?.trim() ?? ''

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [secondaryWarning, setSecondaryWarning] = useState<string | null>(null)
  const [visit, setVisit] = useState<VisitDetailResponse | null>(null)
  const [intake, setIntake] = useState<IntakeSessionResponse | null>(null)
  const [preVisit, setPreVisit] = useState<PreVisitSummaryResponse | null>(null)
  const [clinicalNote, setClinicalNote] = useState<ClinicalNoteLatest | null>(null)
  const [vitalsForm, setVitalsForm] = useState<VitalsFormResponse | null>(null)
  const [vitalsStaffName, setVitalsStaffName] = useState('Nurse')
  const [vitalsValues, setVitalsValues] = useState<Record<string, string>>({})
  const [vitalsMessage, setVitalsMessage] = useState<string | null>(null)
  const [vitalsSubmitting, setVitalsSubmitting] = useState(false)
  const [vitalsLocked, setVitalsLocked] = useState(false)
  const [vitalsFormVisible, setVitalsFormVisible] = useState(false)
  const visitIdRef = useRef('')
  const patientIdRef = useRef('')
  const vitalsFormRef = useRef<VitalsFormResponse | null>(null)
  const vitalsValuesRef = useRef<Record<string, string>>({})
  const vitalsStaffNameRef = useRef('Nurse')
  const [transcriptionStatus, setTranscriptionStatus] = useState<TranscriptionStatusResponse | null>(null)
  const [transcriptionMessage, setTranscriptionMessage] = useState<string | null>(null)
  const [transcriptionText, setTranscriptionText] = useState<string | null>(null)
  const [transcriptionStructuredDialogue, setTranscriptionStructuredDialogue] = useState<Array<
    Record<string, unknown>
  > | null>(null)
  const [structureDialogueLoading, setStructureDialogueLoading] = useState(false)
  const [transcriptionUploading, setTranscriptionUploading] = useState(false)
  /** Last audio file-name successfully accepted by the transcribe API (browser recording or picked file). */
  const [lastSubmittedAudioFilename, setLastSubmittedAudioFilename] = useState<string | null>(null)
  /** Guard freeze behavior until this visit has an explicit upload attempt from UI (current open session). */
  const [hasTranscriptionUploadAttempt, setHasTranscriptionUploadAttempt] = useState(false)
  const [pendingTranscriptionAudio, setPendingTranscriptionAudio] = useState<File | null>(null)
  const pendingTranscriptionAudioRef = useRef<File | null>(null)
  const transcriptionFileInputRef = useRef<HTMLInputElement | null>(null)
  const [transcriptLoading, setTranscriptLoading] = useState(false)
  const [recordingPhase, setRecordingPhase] = useState<'idle' | 'recording' | 'paused' | 'preview'>('idle')
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null)
  const [recordedPreviewFile, setRecordedPreviewFile] = useState<File | null>(null)
  const [previewDurationLabel, setPreviewDurationLabel] = useState('')
  const [recordingError, setRecordingError] = useState<string | null>(null)
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const recorderMimeRef = useRef<string>('')
  const recordingStartedAtRef = useRef<number | null>(null)
  const accumulatedRecordingMsRef = useRef(0)
  const [postVisitSummary, setPostVisitSummary] = useState<PostVisitSummaryResponse | null>(null)
  const [translatedDisplayBundle, setTranslatedDisplayBundle] = useState<{
    intake: IntakeSessionResponse | null
    preVisit: PreVisitSummaryResponse | null
    transcriptionText: string | null
    transcriptionStructuredDialogue: Array<Record<string, unknown>> | null
    clinicalNote: ClinicalNoteLatest | null
    postVisitSummary: PostVisitSummaryResponse | null
  } | null>(null)
  const [chiefEnglish, setChiefEnglish] = useState('')
  const [translatingDisplay, setTranslatingDisplay] = useState(false)
  const [postVisitMessage, setPostVisitMessage] = useState<string | null>(null)
  const [recapContactMode, setRecapContactMode] = useState<'patient' | 'different' | 'family'>('patient')
  const [recapPhoneDraft, setRecapPhoneDraft] = useState('')
  const [recapFollowUpDateDraft, setRecapFollowUpDateDraft] = useState('')
  const [recapFollowUpTimeDraft, setRecapFollowUpTimeDraft] = useState('')
  const [recapAction, setRecapAction] = useState<'generate' | 'send' | null>(null)
  const [postVisitSendInfo, setPostVisitSendInfo] = useState<{
    phoneDisplay: string
    languageDisplay: string
  } | null>(null)
  const [languageMode, setLanguageMode] = useState<'english' | 'preferred'>('english')
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false)
  const [rescheduleError, setRescheduleError] = useState<string | null>(null)
  const [labModalOpen, setLabModalOpen] = useState(false)
  const [labReportName, setLabReportName] = useState('')
  const [labCategory, setLabCategory] = useState('')
  const [labFiles, setLabFiles] = useState<File[]>([])
  const [labDropActive, setLabDropActive] = useState(false)
  const labDropDepthRef = useRef(0)
  const [labUploading, setLabUploading] = useState(false)
  const [labModalError, setLabModalError] = useState<string | null>(null)
  const [labUploadFeedback, setLabUploadFeedback] = useState<string | null>(null)
  const labFileInputRef = useRef<HTMLInputElement | null>(null)

  const syncTabToUrl = useCallback(
    (next: VisitWorkflowTab) => {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.set('tab', next)
      if (visitId) nextParams.set('visitId', visitId)
      setSearchParams(nextParams, { replace: true })
    },
    [searchParams, visitId, setSearchParams],
  )

  const skipPreVisitWorkflow = useMemo(() => {
    if (loading || !visit) return false
    return isWalkInVisitType(visit.visit_type)
  }, [loading, visit])

  const tab = useMemo((): VisitWorkflowTab => {
    const defaultTab: VisitWorkflowTab = 'vitals'
    const seed = tabParamRaw.length > 0 ? tabParamRaw : defaultTab
    let t = normalizeWorkflowTab(seed)
    if (skipPreVisitWorkflow && t === 'pre-visit') t = 'vitals'
    return t
  }, [tabParamRaw, skipPreVisitWorkflow])

  useEffect(() => {
    if (!visitId || loading) return
    if (searchParams.get('tab') !== tab) syncTabToUrl(tab)
  }, [visitId, loading, tab, searchParams, syncTabToUrl])

  const loadWorkspace = useCallback(async () => {
    if (!visitId) {
      setVisit(null)
      setIntake(null)
      setPreVisit(null)
      setClinicalNote(null)
      setSecondaryWarning(null)
      return
    }
    setLoading(true)
    setError(null)
    setSecondaryWarning(null)
    try {
      const summary = await fetchVisitWorkspaceSummary(visitId)
      const v = summary.visit
      setVisit(v)
      setIntake(summary.intake_session ?? null)
      setPreVisit(summary.pre_visit_summary ?? null)
      setClinicalNote(summary.clinical_note ?? null)
      setRecapPhoneDraft(digitsOnlyPhone(v.patient?.phone_number ?? ''))
    } catch (e) {
      setError(getApiErrorMessage(e))
      setVisit(null)
      setIntake(null)
      setPreVisit(null)
      setClinicalNote(null)
      setSecondaryWarning(null)
    } finally {
      setLoading(false)
    }
  }, [visitId])

  /** Draft UI is tied to the visit in the URL — do not clear on every workspace refetch (avoids wiping success/errors after submit). */
  useEffect(() => {
    setVitalsForm(null)
    setVitalsValues({})
    setVitalsMessage(null)
    setVitalsSubmitting(false)
    setVitalsLocked(false)
    setVitalsFormVisible(false)
    setVitalsStaffName('Nurse')
    setTranscriptionStatus(null)
    setTranscriptionMessage(null)
    setTranscriptionText(null)
    setTranscriptionStructuredDialogue(null)
    setStructureDialogueLoading(false)
    setTranscriptionUploading(false)
    setHasTranscriptionUploadAttempt(false)
    pendingTranscriptionAudioRef.current = null
    setPendingTranscriptionAudio(null)
    setRecordingError(null)
    setRecordingPhase('idle')
    setPostVisitSummary(null)
    setPostVisitMessage(null)
    setPostVisitSendInfo(null)
    setRecapContactMode('patient')
    setRecapPhoneDraft('')
    setRecapFollowUpDateDraft('')
    setRecapFollowUpTimeDraft('')
    setLabModalOpen(false)
    setLabReportName('')
    setLabCategory('')
    setLabFiles([])
    setLabDropActive(false)
    labDropDepthRef.current = 0
    setLabUploading(false)
    setLabModalError(null)
    setLabUploadFeedback(null)
    setLanguageMode('english')
  }, [visitId])

  useEffect(() => {
    const p = clinicalNote?.payload
    if (!p || typeof p !== 'object') return
    const o = p as Record<string, unknown>
    const noteDate = (o.follow_up_date != null ? String(o.follow_up_date) : '').trim()
    const noteTime = (o.follow_up_time != null ? String(o.follow_up_time) : '').trim()
    if (noteDate) setRecapFollowUpDateDraft(noteDate)
    if (noteTime) setRecapFollowUpTimeDraft(to12HourTimeDisplay(noteTime))
  }, [clinicalNote?.note_id, clinicalNote?.payload])

  useEffect(() => {
    void loadWorkspace()
  }, [loadWorkspace])

  useEffect(() => {
    if (!labModalOpen) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [labModalOpen])

  useEffect(() => {
    if (!labModalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !labUploading) setLabModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [labModalOpen, labUploading])

  useEffect(() => {
    if (!labUploadFeedback) return
    const t = window.setTimeout(() => setLabUploadFeedback(null), 6000)
    return () => window.clearTimeout(t)
  }, [labUploadFeedback])

  const patientName = useMemo(() => {
    const fn = visit?.patient?.first_name?.trim() ?? ''
    const ln = visit?.patient?.last_name?.trim() ?? ''
    const full = `${fn} ${ln}`.trim()
    return full || 'Patient'
  }, [visit])

  const genderLabel = visit?.patient?.gender ? visit.patient.gender.replace(/_/g, ' ') : '—'
  const chief =
    visit?.chief_complaint?.trim() ||
    preVisit?.sections?.chief_complaint?.reason_for_visit?.trim() ||
    intake?.illness?.trim() ||
    'Consultation'

  const headerChief = (chiefEnglish || chief || 'Consultation').trim()
  const breadcrumbTitle = headerChief.length > 42 ? `${headerChief.slice(0, 40)}…` : headerChief
  const preferredLanguageCode = resolvePreferredLanguageCode(intake?.language, preVisit?.language)
  const langBadge = languageLabel(preferredLanguageCode)
  const languageToggleVisible = tab === 'post-visit'
  const effectiveLanguageMode: 'english' | 'preferred' = languageToggleVisible ? languageMode : 'english'
  const scheduledVisitDisplay = useMemo(() => {
    const raw = (visit?.scheduled_start || '').trim()
    if (!raw) return 'Not booked'
    const dt = new Date(raw)
    if (Number.isNaN(dt.getTime())) return raw
    return dt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  }, [visit?.scheduled_start])
  const postVisitLanguage = toPostVisitPatientLanguage(
    effectiveLanguageMode === 'english' ? 'en' : preferredLanguageCode,
  )
  const activeLanguageLabel = effectiveLanguageMode === 'english' ? 'English' : langBadge
  const queueBadge = visitId ? `#${visitId.slice(-3).toUpperCase()}` : '#—'
  const scheduledBadge = showScheduledPreVisitBadge(visit)
  const visitStatus = visitStatusChip(visit?.status)

  const patientId = visit?.patient_id ?? ''
  useEffect(() => {
    let cancelled = false
    const pref = (preferredLanguageCode || '').trim().toLowerCase()
    if (!chief.trim()) {
      setChiefEnglish('Consultation')
      return
    }
    if (!pref || pref === 'en') {
      setChiefEnglish(chief)
      return
    }
    void (async () => {
      try {
        const translated = await translateDisplayPayload({ chief }, 'English')
        if (!cancelled) setChiefEnglish(String(translated.chief || chief))
      } catch {
        if (!cancelled) setChiefEnglish(chief)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [chief, preferredLanguageCode])

  useEffect(() => {
    let cancelled = false
    if (!languageToggleVisible) {
      setTranslatedDisplayBundle(null)
      setTranslatingDisplay(false)
      return
    }
    const pref = (preferredLanguageCode || '').trim().toLowerCase()
    const shouldTranslateToEnglish = effectiveLanguageMode === 'english' && !!pref && pref !== 'en'
    const shouldTranslateToPreferred = effectiveLanguageMode === 'preferred' && !!pref && pref !== 'en'
    if (!shouldTranslateToEnglish && !shouldTranslateToPreferred) {
      setTranslatedDisplayBundle(null)
      setTranslatingDisplay(false)
      return
    }
    const targetLanguage = shouldTranslateToEnglish ? 'English' : languageLabel(pref)
    const payload = {
      intake,
      preVisit,
      transcriptionText,
      transcriptionStructuredDialogue,
      clinicalNote,
      postVisitSummary,
    }
    setTranslatingDisplay(true)
    void (async () => {
      try {
        const translated = await translateDisplayPayload(payload, targetLanguage)
        if (!cancelled) {
          setTranslatedDisplayBundle({
            intake: (translated.intake as IntakeSessionResponse | null) ?? null,
            preVisit: (translated.preVisit as PreVisitSummaryResponse | null) ?? null,
            transcriptionText: (translated.transcriptionText as string | null) ?? null,
            transcriptionStructuredDialogue:
              (translated.transcriptionStructuredDialogue as Array<Record<string, unknown>> | null) ?? null,
            clinicalNote: (translated.clinicalNote as ClinicalNoteLatest | null) ?? null,
            postVisitSummary: (translated.postVisitSummary as PostVisitSummaryResponse | null) ?? null,
          })
        }
      } catch {
        if (!cancelled) setTranslatedDisplayBundle(null)
      } finally {
        if (!cancelled) setTranslatingDisplay(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    effectiveLanguageMode,
    languageToggleVisible,
    preferredLanguageCode,
    intake,
    preVisit,
    transcriptionText,
    transcriptionStructuredDialogue,
    clinicalNote,
    postVisitSummary,
  ])

  const displayIntake = translatedDisplayBundle?.intake ?? intake
  const displayPreVisit = translatedDisplayBundle?.preVisit ?? preVisit
  const displayTranscriptionText = translatedDisplayBundle?.transcriptionText ?? transcriptionText
  const displayStructuredDialogue =
    translatedDisplayBundle?.transcriptionStructuredDialogue ?? transcriptionStructuredDialogue
  const displayClinicalNote = translatedDisplayBundle?.clinicalNote ?? clinicalNote
  const displayPostVisitSummary = translatedDisplayBundle?.postVisitSummary ?? postVisitSummary
  const recapFollowUpTimeParts = useMemo(
    () => parse12HourTimeParts(recapFollowUpTimeDraft),
    [recapFollowUpTimeDraft],
  )

  visitIdRef.current = visitId
  patientIdRef.current = patientId
  vitalsFormRef.current = vitalsForm
  vitalsValuesRef.current = vitalsValues
  vitalsStaffNameRef.current = vitalsStaffName

  const handleSubmitVitals = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()
      if (vitalsSubmitting) return

      const pid = patientIdRef.current
      const vid = visitIdRef.current
      const form = vitalsFormRef.current
      const vals = vitalsValuesRef.current
      const staff = vitalsStaffNameRef.current.trim() || 'Nurse'

      if (!pid || !vid || !form) {
        setVitalsMessage(
          'Cannot submit vitals: patient or visit is not loaded. Reload this page or open the visit again from the visit list.',
        )
        return
      }

      setVitalsSubmitting(true)
      try {
        const values = form.fields.map((f) => ({
          key: f.key,
          value: isTemperatureCelsiusField(f.key, f.unit)
            ? toCelsiusFromFahrenheit(vals[f.key] ?? '')
            : vals[f.key] ?? '',
        }))
        const res = await submitVitals(pid, vid, form.form_id || null, staff, values)
        const rawId = res.vitals_id ?? (res as { vitalsId?: string }).vitalsId
        const short =
          typeof rawId === 'string' && rawId.length >= 8
            ? rawId.slice(-8)
            : typeof rawId === 'string' && rawId.length > 0
              ? rawId
              : 'saved'
        setVitalsMessage(`Vitals submitted (${short}) · ${new Date().toLocaleTimeString()}`)
        setVitalsLocked(true)
      } catch (err) {
        setVitalsMessage(getApiErrorMessage(err))
      } finally {
        setVitalsSubmitting(false)
      }
    },
    [vitalsSubmitting],
  )

  const handleGenerateVitalsForm = useCallback(async () => {
    if (!patientId || !visitId) return
    try {
      const form = await generateVitalsForm(patientId, visitId)
      setVitalsForm(form)
      const nextValues: Record<string, string> = {}
      form.fields.forEach((f) => {
        nextValues[f.key] = ''
      })
      setVitalsValues(nextValues)
      setVitalsMessage(form.reason)
      setVitalsLocked(false)
      setVitalsFormVisible(true)
    } catch (e) {
      setVitalsMessage(getApiErrorMessage(e))
    }
  }, [patientId, visitId])

  useEffect(() => {
    if (loading) return
    if (!patientId || !visitId) return
    const tState = (transcriptionStatus?.status || '').toLowerCase()
    const hasAttempt = hasTranscriptionUploadAttempt || transcriptionUploading
    const transcriptionProcessingLike = hasAttempt && ['processing', 'in_progress', 'running', 'started'].includes(tState)
    if (transcriptionProcessingLike) {
      setVitalsForm(null)
      setVitalsValues({})
      setVitalsLocked(false)
      setVitalsFormVisible(false)
      setVitalsMessage('Vitals are hidden while transcription is processing. They will be available after transcription completes.')
      return
    }
    if (vitalsForm && postVisitSummary) return
    let cancelled = false
    void (async () => {
      try {
        const [latest, latestPostVisit] = await Promise.all([
          fetchLatestVitalsForVisit(patientId, visitId),
          postVisitSummary
            ? Promise.resolve(postVisitSummary)
            : fetchLatestPostVisitSummary(patientId, visitId),
        ])
        if (cancelled) return
        if (!vitalsForm && latest) {
          const form = await generateVitalsForm(patientId, visitId)
          if (cancelled) return
          setVitalsForm(form)
          const hydratedValues: Record<string, string> = {}
          form.fields.forEach((f) => {
            const raw = latest.values?.[f.key]
            hydratedValues[f.key] = raw == null ? '' : String(raw)
          })
          setVitalsValues(hydratedValues)
          setVitalsStaffName((latest.staff_name || '').trim() || 'Nurse')
          const rawId = latest.vitals_id
          const short = typeof rawId === 'string' && rawId.length >= 8 ? rawId.slice(-8) : rawId || 'saved'
          const at = latest.submitted_at ? ` · ${new Date(latest.submitted_at).toLocaleTimeString()}` : ''
          setVitalsMessage(`Vitals submitted (${short})${at}`)
          setVitalsLocked(true)
          setVitalsFormVisible(true)
        }
        if (!postVisitSummary && latestPostVisit) {
          setPostVisitSummary(latestPostVisit)
        }
      } catch (e) {
        if (cancelled) return
        setVitalsMessage((prev) => prev || getApiErrorMessage(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loading, patientId, postVisitSummary, transcriptionStatus?.status, visitId, vitalsForm])

  const resetLabForm = useCallback(() => {
    setLabReportName('')
    setLabCategory('')
    setLabFiles([])
    setLabModalError(null)
    setLabDropActive(false)
    labDropDepthRef.current = 0
    if (labFileInputRef.current) labFileInputRef.current.value = ''
  }, [])

  const closeLabModal = useCallback(() => {
    if (labUploading) return
    setLabModalOpen(false)
    resetLabForm()
  }, [labUploading, resetLabForm])

  const appendLabFiles = useCallback((list: FileList | null) => {
    if (!list?.length) return
    const picked = Array.from(list)
    const accepted: File[] = []
    let oversized = false
    let badType = false
    for (const f of picked) {
      const okMime = f.type.startsWith('image/') || f.type === 'application/pdf'
      if (!okMime) {
        badType = true
        continue
      }
      if (f.size > LAB_UPLOAD_MAX_BYTES) {
        oversized = true
        continue
      }
      accepted.push(f)
    }
    if (accepted.length === 0) {
      if (oversized) setLabModalError('Each file must be 10 MB or smaller.')
      else if (badType) setLabModalError('Use PDF, JPG, or PNG files only.')
      else setLabModalError('No files could be added.')
      return
    }
    setLabFiles((prev) => [...prev, ...accepted].slice(0, LAB_UPLOAD_MAX_FILES))
    if (labFileInputRef.current) labFileInputRef.current.value = ''
    if (oversized || badType) {
      setLabModalError('Some files were skipped (wrong type or over 10 MB).')
    } else {
      setLabModalError(null)
    }
  }, [])

  const handleLabDropZoneDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    labDropDepthRef.current += 1
    setLabDropActive(true)
  }, [])

  const handleLabDropZoneDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    labDropDepthRef.current -= 1
    if (labDropDepthRef.current <= 0) {
      labDropDepthRef.current = 0
      setLabDropActive(false)
    }
  }, [])

  const handleLabDropZoneDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleLabDropZoneDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      labDropDepthRef.current = 0
      setLabDropActive(false)
      appendLabFiles(e.dataTransfer.files)
    },
    [appendLabFiles],
  )

  const handleSubmitLabResults = useCallback(async () => {
    if (labUploading || !visitId) return

    const imageFiles = labFiles.filter((f) => f.type.startsWith('image/'))
    const pdfFiles = labFiles.filter((f) => f.type === 'application/pdf')

    const metaLines: string[] = []
    if (labReportName.trim()) metaLines.push(`Report: ${labReportName.trim()}`)
    if (labCategory.trim()) metaLines.push(`Category: ${labCategory.trim()}`)
    if (pdfFiles.length > 0) {
      metaLines.push(`Referenced PDF files: ${pdfFiles.map((f) => f.name).join(', ')}`)
    }
    const rawBlock = metaLines.join('\n').trim()

    if (imageFiles.length === 0 && !rawBlock) {
      setLabModalError('Enter a report name, pick a category, or add at least one file.')
      return
    }

    setLabModalError(null)
    setLabUploading(true)
    try {
      let res
      if (imageFiles.length > 0) {
        res = await uploadLabRecordWithImages(visitId, {
          rawText: rawBlock,
          imageFiles,
          source: 'provider_portal',
        })
      } else {
        const text =
          rawBlock ||
          (pdfFiles.length > 0 ? `Lab upload (PDF)\n${pdfFiles.map((f) => `PDF: ${f.name}`).join('\n')}` : '')
        if (!text.trim()) {
          setLabModalError('Add more detail (report name, category, or files).')
          return
        }
        res = await createLabRecordText(visitId, text, 'provider_portal')
      }
      setLabUploadFeedback(`Lab result attached · ${res.record_id}`)
      setLabModalOpen(false)
      resetLabForm()
    } catch (e) {
      setLabModalError(getApiErrorMessage(e))
    } finally {
      setLabUploading(false)
    }
  }, [labUploading, visitId, labReportName, labCategory, labFiles, resetLabForm])

  const stopMediaTracks = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
    mediaStreamRef.current = null
  }, [])

  const submitTranscriptionAudioFile = useCallback(
    async (file: File): Promise<boolean> => {
      if (!patientId || !visitId) return false
      setRecordingError(null)
      setTranscriptionUploading(true)
      try {
        const accepted = await uploadTranscriptionAudio(patientId, visitId, file)
        setHasTranscriptionUploadAttempt(true)
        setLastSubmittedAudioFilename(file.name || 'recording')
        setTranscriptionMessage(accepted.message || `Queued: ${accepted.job_id}`)
        setTranscriptionStatus({ status: accepted.status ?? 'queued', message: accepted.message ?? null })
        setTranscriptionText(null)
        setTranscriptionStructuredDialogue(null)
        return true
      } catch (err) {
        setLastSubmittedAudioFilename(null)
        setTranscriptionMessage(getApiErrorMessage(err))
        return false
      } finally {
        setTranscriptionUploading(false)
      }
    },
    [patientId, visitId],
  )

  const clearPendingTranscriptionFile = useCallback(() => {
    pendingTranscriptionAudioRef.current = null
    setPendingTranscriptionAudio(null)
    const el = transcriptionFileInputRef.current
    if (el) el.value = ''
  }, [])

  const clearRecordingPreview = useCallback(() => {
    setRecordedPreviewFile(null)
    setPreviewDurationLabel('')
    setPreviewAudioUrl(null)
  }, [])

  const discardRecordedPreview = useCallback(() => {
    clearRecordingPreview()
    accumulatedRecordingMsRef.current = 0
    setRecordingElapsedMs(0)
    setRecordingPhase('idle')
    setRecordingError(null)
  }, [clearRecordingPreview])

  const handleUploadPendingTranscription = useCallback(() => {
    if (recordingPhase !== 'idle' || !patientId || !visitId) return
    const f = pendingTranscriptionAudioRef.current ?? pendingTranscriptionAudio
    if (!f) return
    void (async () => {
      const ok = await submitTranscriptionAudioFile(f)
      if (ok) clearPendingTranscriptionFile()
    })()
  }, [
    clearPendingTranscriptionFile,
    patientId,
    pendingTranscriptionAudio,
    recordingPhase,
    submitTranscriptionAudioFile,
    visitId,
  ])

  const loadTranscriptBody = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!patientId || !visitId) return
      if (!opts?.silent) setTranscriptLoading(true)
      try {
        const d = await fetchVisitTranscriptionDialogue(patientId, visitId)
        const raw = d?.transcript?.trim()
        setTranscriptionText(raw && raw.length > 0 ? raw : null)
        const turns = d?.structured_dialogue
        if (Array.isArray(turns) && turns.length > 0) {
          setTranscriptionStructuredDialogue(turns)
        } else {
          setTranscriptionStructuredDialogue(null)
        }
      } catch {
        setTranscriptionText(null)
        setTranscriptionStructuredDialogue(null)
      } finally {
        if (!opts?.silent) setTranscriptLoading(false)
      }
    },
    [patientId, visitId],
  )

  const refreshTranscriptionStatus = useCallback(async () => {
    if (!patientId || !visitId) return
    try {
      const status = await fetchTranscriptionStatus(patientId, visitId)
      const rawStatus = (status.status || '').toLowerCase()
      const rawMessage = (status.message || '').toLowerCase()
      const hadRecentTranscriptionActivity =
        transcriptionUploading || hasTranscriptionUploadAttempt
      const statusMeta = status as Record<string, unknown>
      const hasPersistedTranscriptionSession = Boolean(
        statusMeta.enqueued_at || statusMeta.started_at || statusMeta.completed_at || statusMeta.transcription_id,
      )

      let normalizedStatus =
        rawStatus === 'pending' &&
        rawMessage.includes('not started') &&
        (hadRecentTranscriptionActivity || hasPersistedTranscriptionSession)
          ? { ...status, status: 'queued', message: 'Transcription queued' }
          : status

      setTranscriptionStatus(normalizedStatus)
      const baseMessage = transcriptionStatusUiMessage(normalizedStatus.status, normalizedStatus.message)
      const statusLower = (normalizedStatus.status || '').toLowerCase()
      const processingLike = ['queued', 'pending', 'processing', 'in_progress', 'running', 'started', 'uploading'].includes(
        statusLower,
      )
      if (processingLike) {
        setTranscriptionMessage(baseMessage)
      } else {
        setTranscriptionMessage(baseMessage)
      }
      const st = (normalizedStatus.status || '').toLowerCase()
      if (st === 'completed') {
        await loadTranscriptBody()
      } else {
        setTranscriptionText(null)
        setTranscriptionStructuredDialogue(null)
      }

      // If transcription is terminal, clear the per-visit "upload attempt" guard so
      // reopening the page doesn't keep controls frozen from a prior session.
      if (st === 'completed' || st === 'failed') {
        setHasTranscriptionUploadAttempt(false)
      }
    } catch (e) {
      setTranscriptionMessage(getApiErrorMessage(e))
    }
  }, [patientId, visitId, loadTranscriptBody, transcriptionUploading, hasTranscriptionUploadAttempt])

  const handleStructureVisitDialogue = useCallback(async () => {
    if (!patientId || !visitId || structureDialogueLoading) return
    setStructureDialogueLoading(true)
    try {
      await structureVisitDialogue(patientId, visitId)
      await loadTranscriptBody({ silent: true })
      setTranscriptionMessage('Speaker-labeled dialogue updated.')
    } catch (e) {
      setTranscriptionMessage(getApiErrorMessage(e))
    } finally {
      setStructureDialogueLoading(false)
    }
  }, [loadTranscriptBody, patientId, structureDialogueLoading, visitId])

  const dialogueTurns = useMemo(
    () => flattenStructuredDialogue(displayStructuredDialogue),
    [displayStructuredDialogue],
  )
  const transcriptionStateLowerRaw = (transcriptionStatus?.status || 'pending').toLowerCase()
  const queuedStatuses = new Set(['queued', 'uploading'])
  const processingStatuses = new Set(['processing', 'in_progress', 'running', 'started', 'stale_processing'])
  const effectiveStateLower = transcriptionStateLowerRaw

  const isTranscriptionQueued = queuedStatuses.has(effectiveStateLower)
  const isTranscriptionCurrentlyProcessing = processingStatuses.has(effectiveStateLower)
  const isTranscriptionBusy = transcriptionUploading || isTranscriptionQueued || isTranscriptionCurrentlyProcessing
  // Freeze controls from upload accepted until terminal status.
  const isTranscriptionControlLocked = isTranscriptionBusy

  const transcriptionStateLower = effectiveStateLower

  const effectiveTranscriptionStatus = (() => {
    if (transcriptionStatus) return transcriptionStatus
    return { status: 'pending', message: 'Transcription not started' } as TranscriptionStatusResponse
  })()

  const handleUploadRecordedPreview = useCallback(() => {
    if (!recordedPreviewFile || !patientId || !visitId || isTranscriptionControlLocked) return
    void (async () => {
      const ok = await submitTranscriptionAudioFile(recordedPreviewFile)
      if (ok) {
        clearRecordingPreview()
        setRecordingPhase('idle')
      }
    })()
  }, [
    recordedPreviewFile,
    patientId,
    visitId,
    isTranscriptionControlLocked,
    submitTranscriptionAudioFile,
    clearRecordingPreview,
  ])

  useEffect(() => {
    return () => {
      if (previewAudioUrl) URL.revokeObjectURL(previewAudioUrl)
    }
  }, [previewAudioUrl])

  useEffect(() => {
    if (recordingPhase !== 'recording') return
    const timer = window.setInterval(() => {
      const startedAt = recordingStartedAtRef.current
      const base = accumulatedRecordingMsRef.current
      if (!startedAt) {
        setRecordingElapsedMs(base)
        return
      }
      setRecordingElapsedMs(base + Math.max(0, Date.now() - startedAt))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [recordingPhase])

  useEffect(() => {
    if (tab !== 'transcription' || !patientId || !visitId) return
    void refreshTranscriptionStatus()
  }, [tab, patientId, visitId, refreshTranscriptionStatus])

  useEffect(() => {
    if (tab !== 'transcription' || !patientId || !visitId) return
    if (!isTranscriptionBusy) return
    const timer = window.setInterval(() => {
      void refreshTranscriptionStatus()
    }, 8000)
    return () => window.clearInterval(timer)
  }, [tab, patientId, visitId, isTranscriptionBusy, refreshTranscriptionStatus])

  useEffect(() => {
    return () => {
      const mr = mediaRecorderRef.current
      if (mr && mr.state !== 'inactive') {
        mr.onstop = null
        mr.stop()
      }
      stopMediaTracks()
      mediaRecorderRef.current = null
    }
  }, [stopMediaTracks])

  const handleStartRecording = useCallback(async () => {
    if (!patientId || !visitId) return
    if (typeof MediaRecorder === 'undefined') {
      setRecordingError('Recording is not supported in this browser.')
      return
    }
    if (recordingPhase !== 'idle') return
    clearPendingTranscriptionFile()
    clearRecordingPreview()
    setLastSubmittedAudioFilename(null)
    setRecordingError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      const mime = pickRecorderMimeType()
      recorderMimeRef.current = mime
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      recordedChunksRef.current = []
      accumulatedRecordingMsRef.current = 0
      recordingStartedAtRef.current = Date.now()
      setRecordingElapsedMs(0)
      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordedChunksRef.current.push(ev.data)
      }
      mr.onstop = () => {
        const m = recorderMimeRef.current || mr.mimeType || 'audio/webm'
        const chunks = [...recordedChunksRef.current]
        recordedChunksRef.current = []
        stopMediaTracks()
        mediaRecorderRef.current = null
        recordingStartedAtRef.current = null
        const finalMs = accumulatedRecordingMsRef.current
        accumulatedRecordingMsRef.current = 0
        setRecordingElapsedMs(0)
        if (!chunks.length) {
          setRecordingPhase('idle')
          setRecordingError('No audio was captured. Please try again.')
          return
        }
        const blob = new Blob(chunks, { type: m })
        const ext = m.includes('mp4') || m.includes('m4a') ? 'm4a' : 'webm'
        const file = new File([blob], `visit-recording-${visitId}-${Date.now()}.${ext}`, { type: blob.type })
        setPreviewDurationLabel(formatRecordingElapsed(finalMs))
        setPreviewAudioUrl(URL.createObjectURL(blob))
        setRecordedPreviewFile(file)
        setRecordingPhase('preview')
      }
      mr.start(250)
      setRecordingPhase('recording')
    } catch (e) {
      stopMediaTracks()
      mediaRecorderRef.current = null
      setRecordingPhase('idle')
      setRecordingError(getApiErrorMessage(e))
    }
  }, [clearPendingTranscriptionFile, clearRecordingPreview, patientId, visitId, recordingPhase, stopMediaTracks])

  const handlePauseRecording = useCallback(() => {
    const mr = mediaRecorderRef.current
    if (!mr || mr.state !== 'recording') return
    mr.pause()
    const startedAt = recordingStartedAtRef.current
    if (startedAt) {
      accumulatedRecordingMsRef.current += Math.max(0, Date.now() - startedAt)
    }
    recordingStartedAtRef.current = null
    setRecordingElapsedMs(accumulatedRecordingMsRef.current)
    setRecordingPhase('paused')
  }, [])

  const handleResumeRecording = useCallback(() => {
    const mr = mediaRecorderRef.current
    if (!mr || mr.state !== 'paused') return
    mr.resume()
    recordingStartedAtRef.current = Date.now()
    setRecordingPhase('recording')
  }, [])

  const handleStopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current
    if (!mr || mr.state === 'inactive') {
      stopMediaTracks()
      mediaRecorderRef.current = null
      recordingStartedAtRef.current = null
      accumulatedRecordingMsRef.current = 0
      setRecordingElapsedMs(0)
      setRecordingPhase('idle')
      return
    }
    const startedAt = recordingStartedAtRef.current
    if (startedAt && mr.state === 'recording') {
      accumulatedRecordingMsRef.current += Math.max(0, Date.now() - startedAt)
      setRecordingElapsedMs(accumulatedRecordingMsRef.current)
    }
    recordingStartedAtRef.current = null
    mr.stop()
  }, [stopMediaTracks])

  const tabs: { id: VisitWorkflowTab; label: string; icon: string }[] = [
    { id: 'pre-visit', label: 'Pre-visit', icon: 'event_note' },
    { id: 'vitals', label: 'Vitals', icon: 'monitor_heart' },
    { id: 'transcription', label: 'Transcription', icon: 'mic' },
    { id: 'clinical-note', label: 'Clinical Note', icon: 'clinical_notes' },
    { id: 'post-visit', label: 'Post-visit', icon: 'summarize' },
  ]

  const visibleTabs = useMemo(
    () => tabs.filter((row) => !(skipPreVisitWorkflow && row.id === 'pre-visit')),
    [skipPreVisitWorkflow],
  )

  return (
    <div className="min-h-screen font-sans text-[#171d16] antialiased">
      <header className="fixed right-0 top-0 z-40 flex h-16 w-[calc(100%-240px)] items-center justify-end border-b border-gray-200 bg-white px-8">
        <div className="flex items-center space-x-6">
          <button
            className="relative text-gray-500 transition-opacity hover:opacity-80"
            onClick={() => setIsNotificationsOpen(true)}
            type="button"
          >
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-[#ba1a1a]" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-[#171d16]">{provider.displayName}</p>
              <p className="text-xs text-[#575e70]">{provider.title}</p>
            </div>
            <img alt="" className="h-10 w-10 rounded-full border border-[#bdcaba] object-cover" src={DR_AVATAR} />
          </div>
        </div>
      </header>

      <main className="min-h-screen pt-16">
        {!visitId && (
          <div className="p-8">
            <p className="rounded-xl border border-[#bdcaba] bg-white p-6 text-sm text-[#3e4a3d]">
              Select a visit from the list. Add <code className="font-mono text-xs">visitId</code> to the URL.
            </p>
            <button
              className="mt-4 rounded-lg bg-[#006b2c] px-4 py-2 text-sm font-semibold text-white"
              onClick={() => navigate('/visits')}
              type="button"
            >
              Back to visits
            </button>
          </div>
        )}

        {visitId && error && (
          <div className="mx-8 mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        {visitId && !error && secondaryWarning && !skipPreVisitWorkflow && (
          <div className="mx-8 mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Pre-visit summary could not be loaded: {secondaryWarning}
          </div>
        )}

        {visitId && !error && (
          <>
            <div className="p-8 pb-0">
              <nav className="mb-4 flex items-center space-x-2 text-sm text-[#575e70]">
                <button className="hover:text-[#006b2c]" onClick={() => navigate('/dashboard')} type="button">
                  Dashboard
                </button>
                <span className="material-symbols-outlined text-xs">chevron_right</span>
                <button className="hover:text-[#006b2c]" onClick={() => navigate('/visits')} type="button">
                  Visits
                </button>
                <span className="material-symbols-outlined text-xs">chevron_right</span>
                <span className="font-semibold text-[#171d16]">{breadcrumbTitle}</span>
              </nav>

              <div className="flex flex-col gap-6 rounded-xl bg-[#111827] p-8 text-white md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-6">
                  <div className="relative shrink-0">
                    <img
                      alt=""
                      className="h-20 w-20 rounded-xl border-2 border-[#006b2c] object-cover"
                      src={patientPortraitSrc(visit?.patient?.gender)}
                    />
                    <span className="absolute -bottom-2 -right-2 rounded border-2 border-[#111827] bg-amber-500 px-2 py-1 text-xs font-bold text-[#171d16]">
                      {queueBadge}
                    </span>
                  </div>
                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-3">
                      <h2 className="font-bold text-2xl text-white">{patientName}</h2>
                      <span className="rounded-full bg-[#dde5d9]/20 px-2.5 py-0.5 text-[11px] font-medium">
                        🌐 {langBadge}
                      </span>
                      <span className={visitStatus.className}>{visitStatus.label}</span>
                      {skipPreVisitWorkflow && (
                        <span className="rounded-full bg-white/15 px-3 py-0.5 text-xs font-semibold text-white">
                          Walk-in
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-normal text-gray-400">
                      {ageFromDob(visit?.patient?.date_of_birth)} Years • {genderLabel} • {headerChief}
                    </p>
                    <p className="mt-2 text-xs text-white/80">Appointment: {scheduledVisitDisplay}</p>
                  </div>
                </div>
                <div className="flex w-full flex-col items-stretch gap-2 md:w-auto md:items-end">
                  {labUploadFeedback && (
                    <p className="text-xs text-emerald-300 md:text-right" role="status">
                      {labUploadFeedback}
                    </p>
                  )}
                  <button
                    className="flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-white/20"
                    onClick={() => {
                      resetLabForm()
                      setLabModalOpen(true)
                    }}
                    type="button"
                  >
                    <span className="material-symbols-outlined mr-2">add_circle</span>
                    Add Lab Result
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 overflow-x-auto border-b border-[#bdcaba] px-8">
              {languageToggleVisible && (
                <div className="mb-3 flex items-center justify-end gap-3">
                  <p className="text-sm font-medium text-[#575e70]">Display language: {activeLanguageLabel}</p>
                  <div className="inline-flex items-center rounded-lg border border-[#bdcaba] bg-white p-1">
                    <button
                      className={`rounded-md px-4 py-1.5 text-sm font-semibold ${
                        languageMode === 'english' ? 'bg-[#006b2c] text-white' : 'text-[#575e70]'
                      }`}
                      onClick={() => setLanguageMode('english')}
                      type="button"
                    >
                      English
                    </button>
                    <button
                      className={`rounded-md px-4 py-1.5 text-sm font-semibold ${
                        languageMode === 'preferred' ? 'bg-[#006b2c] text-white' : 'text-[#575e70]'
                      }`}
                      onClick={() => setLanguageMode('preferred')}
                      type="button"
                    >
                      Patient preferred ({langBadge})
                    </button>
                  </div>
                </div>
              )}
              <div className="flex min-w-min gap-8 pb-0">
                {visibleTabs.map((t) => (
                  <button
                    key={t.id}
                    className={`flex shrink-0 items-center border-b-2 pb-4 text-sm font-semibold transition-colors ${
                      tab === t.id
                        ? 'border-[#006b2c] text-[#006b2c]'
                        : 'border-transparent text-[#575e70] hover:text-[#171d16]'
                    }`}
                    onClick={() => syncTabToUrl(t.id)}
                    type="button"
                  >
                    <span className="material-symbols-outlined mr-2 text-xl">{t.icon}</span>
                    {t.label}
                    {t.id === 'pre-visit' && scheduledBadge && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                        Scheduled
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative p-8">
              {loading && <p className="text-sm text-[#575e70]">Loading visit…</p>}

              {translatingDisplay && (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                  <div className="w-full max-w-sm rounded-xl border border-[#bdcaba] bg-white p-5 text-center shadow-sm">
                    <p className="text-sm font-semibold text-[#171d16]">
                      {effectiveLanguageMode === 'english'
                        ? 'Translating to English…'
                        : `Translating to ${languageLabel(preferredLanguageCode)}…`}
                    </p>
                    <p className="mt-1 text-xs text-[#575e70]">Please wait.</p>
                  </div>
                </div>
              )}

              {!loading && tab === 'pre-visit' && (
                <div className="space-y-4">
                  <VisitIntakeCanvas
                    clinicalNote={displayClinicalNote}
                    intake={displayIntake}
                    onPreVisitUpdated={setPreVisit}
                    patientName={patientName}
                    preVisit={displayPreVisit}
                    visit={visit}
                    visitId={visitId}
                  />
                  <div className="flex justify-end">
                    <button
                      className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white"
                      onClick={() => syncTabToUrl('vitals')}
                      type="button"
                    >
                      Next: Vitals
                    </button>
                  </div>
                </div>
              )}

              {!loading && tab === 'vitals' && (
                <div className="space-y-4 rounded-xl border border-[#bdcaba] bg-white p-8 text-sm text-[#3e4a3d] shadow-sm">
                  {isTranscriptionCurrentlyProcessing ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      Transcription is processing. Vitals are temporarily hidden and will be available after transcription
                      completes.
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      className="rounded-lg bg-[#006b2c] px-4 py-2 text-sm font-semibold text-white"
                      disabled={isTranscriptionCurrentlyProcessing}
                      onClick={() => void handleGenerateVitalsForm()}
                      type="button"
                    >
                      Generate Vitals Form
                    </button>
                  </div>
                  {vitalsMessage && <p className="text-xs text-[#575e70]">{vitalsMessage}</p>}
                  {!isTranscriptionCurrentlyProcessing && vitalsFormVisible && vitalsForm && (
                    <>
                      <label className="block text-xs font-semibold text-[#171d16]">
                        Staff Name
                        <input
                          className="mt-1 w-full rounded-md border border-[#bdcaba] px-3 py-2 text-sm"
                          disabled={vitalsLocked || vitalsSubmitting}
                          onChange={(e) => setVitalsStaffName(e.target.value)}
                          value={vitalsStaffName}
                        />
                      </label>
                      <div className="grid gap-3 md:grid-cols-2">
                        {vitalsForm.fields.map((field) => (
                          <label className="block text-xs font-semibold text-[#171d16]" key={field.key}>
                            {isTemperatureCelsiusField(field.key, field.unit) ? 'Temperature (F)' : field.label}
                            <input
                              className="mt-1 w-full rounded-md border border-[#bdcaba] px-3 py-2 text-sm"
                              disabled={vitalsLocked || vitalsSubmitting}
                              onChange={(e) =>
                                setVitalsValues((prev) => ({
                                  ...prev,
                                  [field.key]: e.target.value,
                                }))
                              }
                              placeholder={
                                isTemperatureCelsiusField(field.key, field.unit)
                                  ? 'Unit: F'
                                  : field.unit
                                    ? `Unit: ${field.unit}`
                                    : 'Enter value'
                              }
                              value={vitalsValues[field.key] ?? ''}
                            />
                          </label>
                        ))}
                      </div>
                      <div className="relative z-10 pt-1">
                        <button
                          className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={vitalsSubmitting || !vitalsForm || vitalsLocked}
                          onClick={(ev) => void handleSubmitVitals(ev)}
                          type="button"
                        >
                          {vitalsSubmitting ? 'Submitting…' : vitalsLocked ? 'Submitted' : 'Submit Vitals'}
                        </button>
                      </div>
                    </>
                  )}
                  <div className="flex justify-end border-t border-[#e9f0e5] pt-4">
                    <button
                      className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white"
                      onClick={() => syncTabToUrl('transcription')}
                      type="button"
                    >
                      Next: Transcription
                    </button>
                  </div>
                </div>
              )}

              {!loading && tab === 'transcription' && (
                <div className="space-y-8 rounded-xl border border-[#bdcaba] bg-white p-8 text-sm text-[#3e4a3d] shadow-sm">
                  <header>
                    <h3 className="text-xl font-bold tracking-tight text-[#111827]">Audio transcription</h3>
                  </header>

                  {isTranscriptionQueued && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      Transcription queued…
                    </div>
                  )}
                  {isTranscriptionCurrentlyProcessing && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      Processing transcription…
                    </div>
                  )}

                  <section className="space-y-3">
                    <h4 className="text-sm font-bold tracking-tight text-[#111827]">Upload audio file</h4>
                    <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-stretch">
                      <div className="flex min-h-[52px] min-w-0 flex-1 items-center gap-3 rounded-xl border border-gray-200 bg-[#fafcf8] px-3 py-2 sm:px-4">
                        <input
                          ref={transcriptionFileInputRef}
                          accept="audio/*"
                          aria-label="Select audio file to transcribe"
                          className="sr-only"
                          disabled={!patientId || !visitId || isTranscriptionControlLocked}
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null
                            pendingTranscriptionAudioRef.current = file
                            setPendingTranscriptionAudio(file)
                          }}
                          tabIndex={-1}
                          type="file"
                        />
                        <button
                          className={`inline-flex shrink-0 items-center rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-colors ${
                            !patientId || !visitId || recordingPhase !== 'idle' || isTranscriptionControlLocked
                              ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                              : 'bg-sky-100 text-sky-900 hover:bg-sky-200'
                          }`}
                          disabled={!patientId || !visitId || recordingPhase !== 'idle' || isTranscriptionControlLocked}
                          onClick={() => transcriptionFileInputRef.current?.click()}
                          title={
                            !patientId || !visitId
                              ? 'Visit is not loaded yet'
                              : isTranscriptionControlLocked
                                ? isTranscriptionCurrentlyProcessing
                                  ? 'Please wait while transcription is processing'
                                  : 'Please wait while transcription is queued'
                              : recordingPhase !== 'idle'
                                ? 'Finish or cancel recording before choosing a file'
                                : 'Browse for an audio file'
                          }
                          type="button"
                        >
                          Choose file
                        </button>
                        <span className="min-w-0 truncate text-sm text-[#575e70]" title={pendingTranscriptionAudio?.name}>
                          {pendingTranscriptionAudio ? pendingTranscriptionAudio.name : 'No file chosen'}
                        </span>
                      </div>
                      <button
                        className="relative z-20 shrink-0 rounded-xl bg-[#16a34a] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#15803d] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                        disabled={
                          transcriptionUploading ||
                          !pendingTranscriptionAudio ||
                          !patientId ||
                          !visitId ||
                          recordingPhase !== 'idle' ||
                          isTranscriptionControlLocked
                        }
                        onClick={handleUploadPendingTranscription}
                        type="button"
                      >
                        {transcriptionUploading ? 'Uploading…' : 'Upload'}
                      </button>
                    </div>
                  </section>

                  <div className="relative py-2">
                    <div className="pointer-events-none absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Or
                      </span>
                    </div>
                  </div>

                  <section className="space-y-3">
                    <h4 className="text-sm font-bold tracking-tight text-[#111827]">Record audio</h4>
                    {recordingPhase === 'idle' && (
                      <button
                        className="flex min-h-[6.5rem] w-full flex-col items-center justify-center rounded-xl border-2 border-gray-200 bg-white px-6 py-10 text-[#111827] transition-colors hover:border-[#006b2c]/35 hover:bg-[#f8fdf6] disabled:cursor-not-allowed disabled:opacity-45"
                        disabled={!patientId || !visitId || isTranscriptionControlLocked}
                        onClick={() => void handleStartRecording()}
                        type="button"
                      >
                        <span className="material-symbols-outlined mb-3 text-[32px] text-[#006b2c]" style={{ fontVariationSettings: "'FILL' 1" }}>
                          mic
                        </span>
                        <span className="text-[17px] font-semibold tracking-tight">Start recording</span>
                        <span className="mt-1 max-w-md text-xs font-normal text-[#575e70]">
                          Browser capture — pause or stop when finished. You can listen back, then upload or discard before
                          transcription.
                        </span>
                      </button>
                    )}
                    {(recordingPhase === 'recording' || recordingPhase === 'paused') && (
                      <div className="space-y-3 rounded-xl border-2 border-[#006b2c]/25 bg-[#f8fdf6] p-6">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            className="rounded-xl border border-amber-700 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950"
                            onClick={() => handleStopRecording()}
                            type="button"
                          >
                            <span className="material-symbols-outlined mr-1 align-middle text-[18px]">stop_circle</span>
                            Stop recording
                          </button>
                          <button
                            className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-[#171d16]"
                            onClick={() =>
                              recordingPhase === 'paused' ? handleResumeRecording() : handlePauseRecording()
                            }
                            type="button"
                          >
                            <span className="material-symbols-outlined mr-1 align-middle text-[18px]">
                              {recordingPhase === 'paused' ? 'play_circle' : 'pause_circle'}
                            </span>
                            {recordingPhase === 'paused' ? 'Resume' : 'Pause'}
                          </button>
                        </div>
                        <p className="text-xs font-medium text-[#006b2c]">
                          {recordingPhase === 'recording'
                            ? 'Recording… Speak clearly; you can preview and upload after you stop.'
                            : 'Paused — resume when ready, then stop to review and upload.'}
                        </p>
                        <p className="text-xs font-semibold text-[#111827]">
                          Duration: {formatRecordingElapsed(recordingElapsedMs)}
                        </p>
                      </div>
                    )}
                    {recordingPhase === 'preview' && previewAudioUrl && recordedPreviewFile && (
                      <div className="space-y-4 rounded-xl border-2 border-sky-200 bg-sky-50/60 p-6">
                        <div>
                          <p className="text-sm font-semibold text-[#111827]">Review recording</p>
                          <p className="mt-1 text-xs text-[#575e70]">
                            Duration {previewDurationLabel || '—'} · {recordedPreviewFile.name}. Play to verify, then
                            upload or discard.
                          </p>
                        </div>
                        <audio className="h-10 w-full max-w-xl" controls preload="metadata" src={previewAudioUrl} />
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-xl bg-[#16a34a] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#15803d] disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isTranscriptionControlLocked || !patientId || !visitId}
                            onClick={() => void handleUploadRecordedPreview()}
                            type="button"
                          >
                            {transcriptionUploading ? 'Uploading…' : 'Upload for transcription'}
                          </button>
                          <button
                            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[#171d16] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={transcriptionUploading || isTranscriptionControlLocked}
                            onClick={() => discardRecordedPreview()}
                            type="button"
                          >
                            Discard and re-record
                          </button>
                        </div>
                      </div>
                    )}
                  </section>

                  {recordingError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{recordingError}</div>
                  )}

                  {lastSubmittedAudioFilename && (transcriptionUploading || isTranscriptionCurrentlyProcessing || isTranscriptionQueued) && (
                    <div
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
                      role="status"
                    >
                      <p className="font-semibold">
                        {transcriptionUploading
                          ? 'Uploading audio…'
                          : isTranscriptionCurrentlyProcessing
                            ? 'Audio received — transcription in progress'
                            : 'Audio received — transcription queued'}
                      </p>
                      <p className="mt-1 truncate text-xs text-emerald-900/90" title={lastSubmittedAudioFilename}>
                        File: {lastSubmittedAudioFilename}
                      </p>
                    </div>
                  )}

                  {transcriptionMessage && !isTranscriptionControlLocked && (
                    <p className="text-xs text-[#575e70]" role="status">
                      {transcriptionMessage}
                    </p>
                  )}
                  {transcriptionStatus && (
                    <div className="rounded-lg border border-[#bdcaba] bg-slate-50 p-4 text-xs">
                      <p className="font-medium text-[#171d16]">
                        Status:{' '}
                        {transcriptionStatusUiLabel(
                          (effectiveTranscriptionStatus?.status || transcriptionStatus.status),
                          effectiveTranscriptionStatus?.message ?? transcriptionStatus.message,
                        )}
                      </p>
                      {(transcriptionStatus.error || transcriptionStatus.error_message) && (
                        <p className="mt-1 text-red-700">
                          Error: {transcriptionStatus.error || transcriptionStatus.error_message}
                        </p>
                      )}
                      {typeof transcriptionStatus.word_count === 'number' && (
                        <p className="mt-1 text-[#575e70]">Word count (reported): {transcriptionStatus.word_count}</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-semibold text-[#171d16]">Speaker dialogue</h4>
                      </div>
                      {transcriptLoading && <span className="text-xs text-[#575e70]">Loading…</span>}
                    </div>
                    {dialogueTurns.length > 0 ? (
                      <div className="max-h-[min(28rem,55vh)] space-y-3 overflow-y-auto pr-1">
                        {dialogueTurns.map((line, idx) => (
                          <div
                            className="rounded-lg border border-[#bdcaba] bg-[#fafcf8] p-4 shadow-sm"
                            key={`turn-${idx}`}
                          >
                            <div className="text-xs font-bold uppercase tracking-wide text-[#006b2c]">{line.role}</div>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#171d16]">{line.text}</p>
                          </div>
                        ))}
                      </div>
                    ) : transcriptionStateLower === 'completed' &&
                      (displayTranscriptionText?.length ?? 0) > 0 ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-5 text-sm text-[#3e4a3d]">
                        <p className="mb-3">
                          Raw speech-to-text is ready, but speaker-labeled dialogue is not on file yet. Generate Doctor/Patient
                          turns (server uses OpenAI).
                        </p>
                        <button
                          className="rounded-lg bg-[#006b2c] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={!patientId || !visitId || structureDialogueLoading}
                          onClick={() => void handleStructureVisitDialogue()}
                          type="button"
                        >
                          {structureDialogueLoading ? 'Generating dialogue…' : 'Generate Doctor/Patient dialogue'}
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-[#bdcaba] px-4 py-6 text-center text-xs text-[#575e70]">
                        {transcriptionStateLower === 'completed' ? (
                          <p>
                            No dialogue loaded yet.
                          </p>
                        ) : transcriptionStateLower === 'failed' ? (
                          <p>Transcription failed — fix errors above, upload new audio, and try again.</p>
                        ) : (
                          <p>Dialogue will appear after transcription finishes.</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end border-t border-[#e9f0e5] pt-4">
                    <button
                      className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white"
                      onClick={() => syncTabToUrl('clinical-note')}
                      type="button"
                    >
                      Next: Clinical Note
                    </button>
                  </div>
                </div>
              )}

              {!loading && tab === 'clinical-note' && (
                <div className="space-y-4">
                  <VisitClinicalNotePanel
                    clinicalNote={displayClinicalNote}
                    onNoteUpdated={setClinicalNote}
                    onApproveNext={({ followUpDate, followUpTime }) => {
                      setRecapFollowUpDateDraft(followUpDate)
                      setRecapFollowUpTimeDraft(followUpTime)
                      syncTabToUrl('post-visit')
                    }}
                    patientId={patientId}
                    transcriptionCompleted={(transcriptionStatus?.status || '').toLowerCase() === 'completed'}
                    transcriptionStatusKnown={transcriptionStatus != null}
                    visitId={visitId}
                    visitTitle={chief}
                  />
                  <div className="flex justify-end">
                    <button
                      className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white"
                      onClick={() => syncTabToUrl('post-visit')}
                      type="button"
                    >
                      Next: Post-Visit
                    </button>
                  </div>
                </div>
              )}

              {!loading && tab === 'post-visit' && (
                <div className="w-full space-y-6 rounded-xl border border-[#bdcaba] bg-white p-8 text-sm text-[#3e4a3d] shadow-sm">
                  <div>
                    <h3 className="text-lg font-semibold text-[#171d16]">Send post-visit recap</h3>
                    <p className="mt-1 text-xs text-[#575e70]">
                      Choose the WhatsApp number for this send.
                    </p>
                    {translatingDisplay && preferredLanguageCode.toLowerCase() !== 'en' && (
                      <p className="mt-1 text-xs text-[#575e70]">
                        {effectiveLanguageMode === 'english'
                          ? 'Translating display content to English…'
                          : `Translating display content to ${languageLabel(preferredLanguageCode)}…`}
                      </p>
                    )}
                  </div>

                  <fieldset className="space-y-3">
                    <legend className="text-xs font-semibold uppercase tracking-wide text-[#575e70]">
                      WhatsApp recipient
                    </legend>
                    {(
                      [
                        ['patient', "Patient's WhatsApp"] as const,
                        ['different', 'Different number'] as const,
                        ['family', 'Family member'] as const,
                      ]
                    ).map(([value, label]) => (
                      <label key={value} className="flex cursor-pointer items-center gap-2">
                        <input
                          checked={recapContactMode === value}
                          className="text-[#006b2c]"
                          name="recap-contact"
                          onChange={() => setRecapContactMode(value)}
                          type="radio"
                          value={value}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                    {recapContactMode !== 'patient' && (
                      <input
                        className="mt-2 w-full max-w-md rounded-lg border border-[#bdcaba] px-3 py-2 text-[#171d16]"
                        inputMode="numeric"
                        onChange={(e) => setRecapPhoneDraft(e.target.value)}
                        placeholder="e.g. 919876543210"
                        type="text"
                        value={recapPhoneDraft}
                      />
                    )}
                  </fieldset>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[#575e70]">
                      Next visit date (optional)
                      <input
                        className="mt-2 w-full max-w-xs rounded-lg border border-[#bdcaba] px-3 py-2 text-sm text-[#171d16]"
                        onChange={(e) => setRecapFollowUpDateDraft(e.target.value)}
                        type="date"
                        value={recapFollowUpDateDraft}
                      />
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[#575e70]">
                      Follow-up time (optional)
                      <div className="mt-2 flex w-full max-w-xs items-center gap-2">
                        <select
                          className="w-20 rounded-lg border border-[#bdcaba] px-2 py-2 text-sm text-[#171d16]"
                          onChange={(e) =>
                            setRecapFollowUpTimeDraft(
                              compose12HourTime({
                                hour: e.target.value,
                                minute: recapFollowUpTimeParts.minute,
                                period: recapFollowUpTimeParts.period,
                              }),
                            )
                          }
                          value={recapFollowUpTimeParts.hour}
                        >
                          <option value="">HH</option>
                          {HOUR_OPTIONS_12H.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        <select
                          className="w-20 rounded-lg border border-[#bdcaba] px-2 py-2 text-sm text-[#171d16]"
                          onChange={(e) =>
                            setRecapFollowUpTimeDraft(
                              compose12HourTime({
                                hour: recapFollowUpTimeParts.hour,
                                minute: e.target.value,
                                period: recapFollowUpTimeParts.period,
                              }),
                            )
                          }
                          value={recapFollowUpTimeParts.minute}
                        >
                          <option value="">MM</option>
                          {MINUTE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        <select
                          className="w-24 rounded-lg border border-[#bdcaba] px-2 py-2 text-sm text-[#171d16]"
                          onChange={(e) =>
                            setRecapFollowUpTimeDraft(
                              compose12HourTime({
                                hour: recapFollowUpTimeParts.hour,
                                minute: recapFollowUpTimeParts.minute,
                                period: e.target.value,
                              }),
                            )
                          }
                          value={recapFollowUpTimeParts.period}
                        >
                          <option value="">AM/PM</option>
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </label>
                  </div>

                  {displayPostVisitSummary?.whatsapp_payload?.trim() && (
                    <div className="rounded-xl border border-[#62df7d]/40 bg-[#e8f8eb] p-4">
                      <p className="mb-2 text-xs font-semibold text-[#006b2c]">Preview</p>
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#171d16]">
                        {displayPostVisitSummary.whatsapp_payload.trim()}
                      </pre>
                      <p className="mt-2 text-xs text-[#575e70]">Approved WhatsApp template · post-visit recap</p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#e9f0e5] pt-6">
                    <button
                      className="rounded-lg border border-[#bdcaba] bg-white px-4 py-2 text-sm font-semibold text-[#171d16] hover:bg-gray-50 disabled:opacity-50"
                      disabled={!patientId || !visitId || recapAction !== null}
                      onClick={() => {
                        if (!patientId || !visitId) return
                        void (async () => {
                          setRecapAction('generate')
                          setPostVisitMessage(null)
                          setPostVisitSendInfo(null)
                          try {
                            const nextVisitDate = recapFollowUpDateDraft.trim()
                            const nextVisitTime = to24HourTimeForApi(recapFollowUpTimeDraft.trim())
                            const res = await generatePostVisitSummary(patientId, visitId, {
                              preferred_language: postVisitLanguage,
                              follow_up_date: nextVisitDate || undefined,
                              follow_up_time: nextVisitTime || undefined,
                            })
                            setPostVisitSummary(res)
                            setPostVisitMessage('Post-visit summary generated. Review the preview, then send.')
                          } catch (e) {
                            setPostVisitMessage(getApiErrorMessage(e))
                          } finally {
                            setRecapAction(null)
                          }
                        })()
                      }}
                      type="button"
                    >
                      {recapAction === 'generate' ? 'Generating…' : 'Generate / refresh summary'}
                    </button>
                    <button
                      className="rounded-lg bg-[#16a34a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#006b2c] disabled:opacity-50"
                      disabled={!patientId || !visitId || !postVisitSummary?.whatsapp_payload?.trim() || recapAction !== null}
                      onClick={() => {
                        if (!patientId || !visitId) return
                        if (!postVisitSummary?.whatsapp_payload?.trim()) {
                          setPostVisitMessage('Generate the post-visit summary before sending.')
                          return
                        }
                        const overrideDigits =
                          recapContactMode === 'patient' ? '' : digitsOnlyPhone(recapPhoneDraft)
                        if (recapContactMode !== 'patient' && !overrideDigits) {
                          setPostVisitMessage('Enter a WhatsApp number for this recipient.')
                          return
                        }
                        void (async () => {
                          setRecapAction('send')
                          setPostVisitMessage(null)
                          try {
                            const res = await sendPostVisitSummaryWhatsApp(patientId, visitId, {
                              phone_number: recapContactMode === 'patient' ? undefined : overrideDigits,
                              preferred_language: postVisitLanguage,
                            })
                            setPostVisitMessage(res.message)
                            const phoneDisplay =
                              recapContactMode === 'patient'
                                ? formatIndiaWhatsAppDisplay(visit?.patient?.phone_number ?? '')
                                : formatIndiaWhatsAppDisplay(overrideDigits)
                            setPostVisitSendInfo({
                              phoneDisplay,
                              languageDisplay: languageLabel(postVisitLanguage),
                            })
                          } catch (e) {
                            setPostVisitSendInfo(null)
                            setPostVisitMessage(getApiErrorMessage(e))
                          } finally {
                            setRecapAction(null)
                          }
                        })()
                      }}
                      type="button"
                    >
                      {recapAction === 'send' ? 'Sending…' : 'Send now'}
                    </button>
                  </div>

                  {postVisitMessage && (
                    <p className="text-xs text-[#575e70]" role="status">
                      {postVisitMessage}
                    </p>
                  )}

                  {postVisitSendInfo && (
                    <div className="rounded-xl border border-[#62df7d]/50 bg-[#f0fdf4] p-6 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#16a34a] text-white">
                        <span className="material-symbols-outlined text-2xl">check</span>
                      </div>
                      <p className="text-lg font-semibold text-[#171d16]">Message sent</p>
                      <p className="mt-1 text-sm text-[#3e4a3d]">
                        {postVisitSendInfo.phoneDisplay} · {postVisitSendInfo.languageDisplay}
                      </p>
                      <p className="mt-2 text-xs text-[#575e70]">Post-visit recap template</p>
                    </div>
                  )}

                  {displayPostVisitSummary?.payload && (
                    <div className="space-y-2 rounded-lg border border-[#bdcaba] bg-slate-50 p-4 text-xs">
                      <p>
                        <strong>Visit reason:</strong> {displayPostVisitSummary.payload.visit_reason || '—'}
                      </p>
                      <p>
                        <strong>Findings:</strong> {displayPostVisitSummary.payload.what_doctor_found || '—'}
                      </p>
                      <p>
                        <strong>Follow-up:</strong> {displayPostVisitSummary.payload.follow_up || '—'}
                      </p>
                      <p>
                        <strong>Next visit date:</strong> {displayPostVisitSummary.payload.next_visit_date || '—'}
                      </p>
                      <p>
                        <strong>Medicines to take:</strong>{' '}
                        {displayPostVisitSummary.payload.medicines_to_take?.length
                          ? displayPostVisitSummary.payload.medicines_to_take.join(', ')
                          : '—'}
                      </p>
                      <p>
                        <strong>Tests recommended:</strong>{' '}
                        {displayPostVisitSummary.payload.tests_recommended?.length
                          ? displayPostVisitSummary.payload.tests_recommended.join(', ')
                          : '—'}
                      </p>
                      <p>
                        <strong>Self-care:</strong>{' '}
                        {displayPostVisitSummary.payload.self_care?.length
                          ? displayPostVisitSummary.payload.self_care.join(', ')
                          : '—'}
                      </p>
                      <p>
                        <strong>Warning signs:</strong>{' '}
                        {displayPostVisitSummary.payload.warning_signs?.length
                          ? displayPostVisitSummary.payload.warning_signs.join(', ')
                          : '—'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {rescheduleOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#171d16]/40 p-4 backdrop-blur-sm">
          <button aria-label="Close reschedule dialog" className="absolute inset-0" onClick={() => setRescheduleOpen(false)} type="button" />
          <div className="relative z-[111] w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-[#171d16]">Edit Appointment</h3>
            <p className="mt-1 text-sm text-[#3e4a3d]">{patientName}</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#575e70]">
                Date
                <input
                  className="mt-1 w-full rounded-lg border border-[#bdcaba] px-3 py-2 text-sm text-[#171d16]"
                  min={localDateInputMin()}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  type="date"
                  value={rescheduleDate}
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-[#575e70]">
                Time
                <input
                  className="mt-1 w-full rounded-lg border border-[#bdcaba] px-3 py-2 text-sm text-[#171d16]"
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  type="time"
                  value={rescheduleTime}
                />
              </label>
            </div>
            {rescheduleError && <p className="mt-3 text-xs text-red-700">{rescheduleError}</p>}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-[#171d16] hover:bg-slate-50"
                onClick={() => setRescheduleOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                disabled={rescheduleSubmitting || !rescheduleDate || !rescheduleTime || !visitId}
                onClick={() => {
                  void (async () => {
                    try {
                      setRescheduleSubmitting(true)
                      setRescheduleError(null)
                      await scheduleVisitIntake(visitId, { appointment_date: rescheduleDate, appointment_time: rescheduleTime })
                      const refreshed = await fetchVisitDetail(visitId)
                      setVisit(refreshed)
                      setRescheduleOpen(false)
                    } catch (e) {
                      setRescheduleError(getApiErrorMessage(e))
                    } finally {
                      setRescheduleSubmitting(false)
                    }
                  })()
                }}
                type="button"
              >
                {rescheduleSubmitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {labModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#171d16]/40 p-4 backdrop-blur-sm">
          <button
            aria-label="Close lab upload dialog"
            className="absolute inset-0"
            onClick={closeLabModal}
            type="button"
          />
          <div
            className="relative z-[101] w-full max-w-[520px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lab-upload-title"
          >
            <div className="flex items-center justify-between bg-[#111827] px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-white">upload_file</span>
                <h3 className="text-lg font-semibold text-white" id="lab-upload-title">
                  Upload Lab Result
                </h3>
              </div>
              <button
                className="text-gray-400 transition-colors hover:text-white disabled:opacity-40"
                disabled={labUploading}
                onClick={closeLabModal}
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="max-h-[min(85vh,640px)] space-y-6 overflow-y-auto p-8">
              <input
                accept=".pdf,image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => appendLabFiles(e.target.files)}
                ref={labFileInputRef}
                type="file"
                multiple
              />
              <button
                className={`group flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                  labDropActive
                    ? 'border-[#006b2c]/60 bg-[#006b2c]/5'
                    : 'border-gray-300 bg-gray-50 hover:border-[#006b2c]/40 hover:bg-[#006b2c]/[0.03]'
                }`}
                onClick={() => labFileInputRef.current?.click()}
                onDragEnter={handleLabDropZoneDragEnter}
                onDragLeave={handleLabDropZoneDragLeave}
                onDragOver={handleLabDropZoneDragOver}
                onDrop={handleLabDropZoneDrop}
                type="button"
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm transition-transform group-hover:scale-110">
                  <span className="material-symbols-outlined text-4xl text-[#006b2c]">cloud_upload</span>
                </div>
                <p className="mb-1 font-semibold text-[#171d16]">Click to upload or drag and drop</p>
                <p className="text-sm text-[#575e70]">PDF, JPG, or PNG (Max. 10MB)</p>
              </button>

              {labFiles.length > 0 && (
                <ul className="space-y-1.5 rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs text-[#3e4a3d]">
                  {labFiles.map((f, i) => (
                    <li className="flex items-center justify-between gap-2" key={`${f.name}-${i}-${f.size}`}>
                      <span className="min-w-0 truncate">{f.name}</span>
                      <button
                        className="shrink-0 font-medium text-[#006b2c] underline disabled:opacity-40"
                        disabled={labUploading}
                        onClick={(e) => {
                          e.stopPropagation()
                          setLabFiles((prev) => prev.filter((_, j) => j !== i))
                        }}
                        type="button"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium uppercase tracking-[0.05em] text-[#3e4a3d]" htmlFor="lab-report-name">
                    Report Name
                  </label>
                  <input
                    className="w-full rounded-lg border border-[#e5e7eb] px-4 py-2.5 text-sm text-[#171d16] outline-none transition-all focus:ring-2 focus:ring-[#2563eb]"
                    id="lab-report-name"
                    onChange={(e) => setLabReportName(e.target.value)}
                    placeholder="e.g. Metabolic Panel Oct 2023"
                    type="text"
                    value={labReportName}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium uppercase tracking-[0.05em] text-[#3e4a3d]" htmlFor="lab-test-category">
                    Test Category
                  </label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 pr-10 text-sm text-[#171d16] outline-none transition-all focus:ring-2 focus:ring-[#2563eb]"
                      id="lab-test-category"
                      onChange={(e) => setLabCategory(e.target.value)}
                      value={labCategory}
                    >
                      {LAB_TEST_CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt || 'placeholder'} value={opt}>
                          {opt || 'Select a category'}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined">
                      expand_more
                    </span>
                  </div>
                </div>
              </div>

              {labModalError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{labModalError}</p>
              )}

              <button
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#16a34a] py-3.5 font-semibold text-white shadow-md transition-all hover:bg-[#15803d] hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={labUploading}
                onClick={() => void handleSubmitLabResults()}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">attachment</span>
                Upload &amp; Attach to Visit
              </button>
              <button
                className="w-full py-1 text-sm font-medium text-[#575e70] transition-colors hover:text-[#171d16] disabled:opacity-40"
                disabled={labUploading}
                onClick={closeLabModal}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}
