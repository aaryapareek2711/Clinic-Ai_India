import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { getApiErrorMessage } from '../lib/apiClient'
import {
  fetchIntakeSession,
  fetchLatestClinicalNote,
  fetchPreVisitSummary,
  fetchTranscriptionStatus,
  fetchVisitDetail,
  fetchVisitTranscriptionDialogue,
  structureVisitDialogue,
  generatePostVisitSummary,
  generateVitalsForm,
  sendPostVisitSummaryWhatsApp,
  type PostVisitPatientLanguage,
  submitVitals,
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

function ageFromDob(dob: string | undefined): string {
  if (!dob) return '—'
  const y = new Date(dob).getFullYear()
  if (Number.isNaN(y) || y < 1900) return '—'
  return `${new Date().getFullYear() - y}`
}

function normalizeWorkflowTab(raw: string): VisitWorkflowTab {
  const mapped = LEGACY_TAB_MAP[raw]
  if (mapped) return mapped
  if (TAB_ORDER.includes(raw as VisitWorkflowTab)) return raw as VisitWorkflowTab
  return 'vitals'
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

function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  return ''
}

/** Pre-visit step is aimed at visits that have a scheduled slot (board-style workflow). */
function showScheduledPreVisitBadge(v: VisitDetailResponse | null): boolean {
  if (!v?.scheduled_start) return false
  const s = (v.status || '').toLowerCase()
  return ['scheduled', 'open', 'queued', 'in_queue', 'in_progress'].includes(s)
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
  const [pendingTranscriptionAudio, setPendingTranscriptionAudio] = useState<File | null>(null)
  const pendingTranscriptionAudioRef = useRef<File | null>(null)
  const transcriptionFileInputRef = useRef<HTMLInputElement | null>(null)
  const [transcriptLoading, setTranscriptLoading] = useState(false)
  const [recordingPhase, setRecordingPhase] = useState<'idle' | 'recording' | 'paused'>('idle')
  const [recordingError, setRecordingError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const recorderMimeRef = useRef<string>('')
  const [postVisitSummary, setPostVisitSummary] = useState<PostVisitSummaryResponse | null>(null)
  const [postVisitMessage, setPostVisitMessage] = useState<string | null>(null)
  const [recapContactMode, setRecapContactMode] = useState<'patient' | 'different' | 'family'>('patient')
  const [recapPhoneDraft, setRecapPhoneDraft] = useState('')
  const [recapPatientLang, setRecapPatientLang] = useState<PostVisitPatientLanguage>('en')
  const [recapAction, setRecapAction] = useState<'generate' | 'send' | null>(null)
  const [postVisitSendInfo, setPostVisitSendInfo] = useState<{
    phoneDisplay: string
    languageDisplay: string
  } | null>(null)

  const syncTabToUrl = useCallback(
    (next: VisitWorkflowTab) => {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.set('tab', next)
      if (visitId) nextParams.set('visitId', visitId)
      setSearchParams(nextParams, { replace: true })
    },
    [searchParams, visitId, setSearchParams],
  )

  const resolvedVisitKey = visit?.visit_id ?? visit?.id ?? ''
  const skipPreVisitWorkflow = useMemo(() => {
    if (loading || !visitId || !visit || resolvedVisitKey !== visitId) return false
    return isWalkInVisitType(visit.visit_type)
  }, [loading, visitId, visit, resolvedVisitKey])

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
      const v = await fetchVisitDetail(visitId)
      setVisit(v)
      const pid = v.patient_id
      const walkIn = isWalkInVisitType(v.visit_type)

      const intakePromise = walkIn
        ? Promise.resolve(null)
        : fetchIntakeSession(visitId).catch(() => null)
      const prePromise = walkIn
        ? Promise.resolve(null)
        : fetchPreVisitSummary(pid, visitId).catch((e) => {
            setSecondaryWarning(getApiErrorMessage(e))
            return null
          })

      const [intakeRes, preRes, noteRes] = await Promise.all([
        intakePromise,
        prePromise,
        fetchLatestClinicalNote(pid, visitId),
      ])
      setIntake(intakeRes)
      setPreVisit(preRes)
      setClinicalNote(noteRes)
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
    setVitalsStaffName('Nurse')
    setTranscriptionStatus(null)
    setTranscriptionMessage(null)
    setTranscriptionText(null)
    setTranscriptionStructuredDialogue(null)
    setStructureDialogueLoading(false)
    setTranscriptionUploading(false)
    pendingTranscriptionAudioRef.current = null
    setPendingTranscriptionAudio(null)
    setRecordingError(null)
    setRecordingPhase('idle')
    setPostVisitSummary(null)
    setPostVisitMessage(null)
    setPostVisitSendInfo(null)
    setRecapContactMode('patient')
    setRecapPatientLang('en')
    setRecapPhoneDraft('')
  }, [visitId])

  useEffect(() => {
    void loadWorkspace()
  }, [loadWorkspace])

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

  const breadcrumbTitle = chief.length > 42 ? `${chief.slice(0, 40)}…` : chief
  const langBadge = languageLabel(preVisit?.language ?? 'en')
  const queueBadge = visitId ? `#${visitId.slice(-3).toUpperCase()}` : '#—'
  const scheduledBadge = showScheduledPreVisitBadge(visit)

  const notePayload = clinicalNote?.payload
  const patientId = visit?.patient_id ?? ''

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
          value: vals[f.key] ?? '',
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
      } catch (err) {
        setVitalsMessage(getApiErrorMessage(err))
      } finally {
        setVitalsSubmitting(false)
      }
    },
    [vitalsSubmitting],
  )

  const stopMediaTracks = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
    mediaStreamRef.current = null
  }, [])

  const submitTranscriptionAudioFile = useCallback(
    async (file: File): Promise<boolean> => {
      if (!patientId || !visitId) return false
      setRecordingError(null)
      try {
        const accepted = await uploadTranscriptionAudio(patientId, visitId, file)
        setTranscriptionMessage(accepted.message || `Queued: ${accepted.job_id}`)
        setTranscriptionStatus({ status: accepted.status ?? 'queued', message: accepted.message ?? null })
        setTranscriptionText(null)
        setTranscriptionStructuredDialogue(null)
        return true
      } catch (err) {
        setTranscriptionMessage(getApiErrorMessage(err))
        return false
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

  const handleUploadPendingTranscription = useCallback(() => {
    if (recordingPhase !== 'idle' || !patientId || !visitId || transcriptionUploading) return
    const f = pendingTranscriptionAudioRef.current ?? pendingTranscriptionAudio
    if (!f) return
    void (async () => {
      setTranscriptionUploading(true)
      try {
        const ok = await submitTranscriptionAudioFile(f)
        if (ok) clearPendingTranscriptionFile()
      } finally {
        setTranscriptionUploading(false)
      }
    })()
  }, [
    clearPendingTranscriptionFile,
    patientId,
    pendingTranscriptionAudio,
    recordingPhase,
    submitTranscriptionAudioFile,
    transcriptionUploading,
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
      setTranscriptionStatus(status)
      setTranscriptionMessage(status.message || status.status)
      const st = (status.status || '').toLowerCase()
      if (st === 'completed') {
        await loadTranscriptBody()
      } else {
        setTranscriptionText(null)
        setTranscriptionStructuredDialogue(null)
      }
    } catch (e) {
      setTranscriptionMessage(getApiErrorMessage(e))
    }
  }, [patientId, visitId, loadTranscriptBody])

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
    () => flattenStructuredDialogue(transcriptionStructuredDialogue),
    [transcriptionStructuredDialogue],
  )

  useEffect(() => {
    if (tab !== 'transcription' || !patientId || !visitId) return
    void loadTranscriptBody({ silent: true })
  }, [tab, patientId, visitId, loadTranscriptBody])

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
    setRecordingError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      const mime = pickRecorderMimeType()
      recorderMimeRef.current = mime
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      recordedChunksRef.current = []
      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordedChunksRef.current.push(ev.data)
      }
      mr.onstop = () => {
        const m = recorderMimeRef.current || mr.mimeType || 'audio/webm'
        const chunks = [...recordedChunksRef.current]
        recordedChunksRef.current = []
        stopMediaTracks()
        mediaRecorderRef.current = null
        setRecordingPhase('idle')
        if (!chunks.length) return
        const blob = new Blob(chunks, { type: m })
        const ext = m.includes('mp4') || m.includes('m4a') ? 'm4a' : 'webm'
        const file = new File([blob], `visit-recording-${visitId}-${Date.now()}.${ext}`, { type: blob.type })
        void submitTranscriptionAudioFile(file)
      }
      mr.start(250)
      setRecordingPhase('recording')
    } catch (e) {
      stopMediaTracks()
      mediaRecorderRef.current = null
      setRecordingPhase('idle')
      setRecordingError(getApiErrorMessage(e))
    }
  }, [clearPendingTranscriptionFile, patientId, visitId, recordingPhase, submitTranscriptionAudioFile, stopMediaTracks])

  const handlePauseRecording = useCallback(() => {
    const mr = mediaRecorderRef.current
    if (!mr || mr.state !== 'recording') return
    mr.pause()
    setRecordingPhase('paused')
  }, [])

  const handleResumeRecording = useCallback(() => {
    const mr = mediaRecorderRef.current
    if (!mr || mr.state !== 'paused') return
    mr.resume()
    setRecordingPhase('recording')
  }, [])

  const handleStopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current
    if (!mr || mr.state === 'inactive') {
      stopMediaTracks()
      mediaRecorderRef.current = null
      setRecordingPhase('idle')
      return
    }
    mr.stop()
  }, [stopMediaTracks])

  const tabs: { id: VisitWorkflowTab; label: string; icon: string }[] = [
    { id: 'vitals', label: 'Vitals', icon: 'monitor_heart' },
    { id: 'transcription', label: 'Transcription', icon: 'mic' },
    { id: 'clinical-note', label: 'Clinical Note', icon: 'clinical_notes' },
    { id: 'post-visit', label: 'Post-visit', icon: 'summarize' },
  ]

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
              <p className="text-sm font-semibold text-[#171d16]">Dr. Rajesh Kumar</p>
              <p className="text-xs text-[#575e70]">Senior Pulmonologist</p>
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
                      <span className="rounded-full bg-[#dde5d9]/20 px-3 py-0.5 text-xs font-medium">
                        🌐 {langBadge}
                      </span>
                      {skipPreVisitWorkflow && (
                        <span className="rounded-full bg-white/15 px-3 py-0.5 text-xs font-semibold text-white">
                          Walk-in
                        </span>
                      )}
                    </div>
                    <p className="font-normal text-gray-400">
                      {ageFromDob(visit?.patient?.date_of_birth)} Years • {genderLabel} • {chief}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    className="flex items-center rounded-lg border border-white/20 bg-white/10 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-white/20"
                    type="button"
                  >
                    <span className="material-symbols-outlined mr-2">add_circle</span>
                    Add Lab Result
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 px-8">
              {!skipPreVisitWorkflow && (
                <div className="mb-4 md:hidden">
                  <button
                    className={`flex w-full items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-colors ${
                      tab === 'pre-visit'
                        ? 'border-[#006b2c] bg-[#f0fdf4] text-[#006b2c]'
                        : 'border-[#bdcaba] bg-white text-[#575e70]'
                    }`}
                    onClick={() => syncTabToUrl('pre-visit')}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-xl">assignment_turned_in</span>
                    Care Prep
                    {scheduledBadge && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                        Scheduled
                      </span>
                    )}
                  </button>
                </div>
              )}
              <div className="flex gap-6">
                {!skipPreVisitWorkflow && (
                  <aside className="hidden w-44 shrink-0 md:block">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#575e70]">Care Prep</p>
                    <button
                      className={`flex w-full flex-col items-start rounded-lg border-2 px-3 py-3 text-left text-sm font-semibold transition-colors ${
                        tab === 'pre-visit'
                          ? 'border-[#006b2c] bg-[#f0fdf4] text-[#006b2c]'
                          : 'border-[#bdcaba] bg-white text-[#575e70] hover:border-[#006b2c]/40'
                      }`}
                      onClick={() => syncTabToUrl('pre-visit')}
                      type="button"
                    >
                      <span className="material-symbols-outlined mb-1 text-2xl">assignment_turned_in</span>
                      <span>Intake & summary</span>
                      {scheduledBadge && (
                        <span className="mt-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                          Scheduled
                        </span>
                      )}
                    </button>
                  </aside>
                )}
                <div className="min-w-0 flex-1">
                  <div className="overflow-x-auto border-b border-[#bdcaba]">
                    <div className="flex min-w-min gap-8 pb-0">
                      {tabs.map((t) => (
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
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="py-8">
              {loading && <p className="text-sm text-[#575e70]">Loading visit…</p>}

              {!loading && tab === 'pre-visit' && (
                <VisitIntakeCanvas
                  clinicalNote={clinicalNote}
                  intake={intake}
                  onPreVisitUpdated={setPreVisit}
                  patientName={patientName}
                  preVisit={preVisit}
                  visit={visit}
                  visitId={visitId}
                />
              )}

              {!loading && tab === 'vitals' && (
                <div className="space-y-4 rounded-xl border border-[#bdcaba] bg-white p-8 text-sm text-[#3e4a3d] shadow-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      className="rounded-lg bg-[#006b2c] px-4 py-2 text-sm font-semibold text-white"
                      onClick={() => {
                        if (!patientId || !visitId) return
                        void (async () => {
                          try {
                            const form = await generateVitalsForm(patientId, visitId)
                            setVitalsForm(form)
                            const nextValues: Record<string, string> = {}
                            form.fields.forEach((f) => {
                              nextValues[f.key] = ''
                            })
                            setVitalsValues(nextValues)
                            setVitalsMessage(form.reason)
                          } catch (e) {
                            setVitalsMessage(getApiErrorMessage(e))
                          }
                        })()
                      }}
                      type="button"
                    >
                      Generate Vitals Form
                    </button>
                  </div>
                  {vitalsMessage && <p className="text-xs text-[#575e70]">{vitalsMessage}</p>}
                  {vitalsForm && (
                    <>
                      <label className="block text-xs font-semibold text-[#171d16]">
                        Staff Name
                        <input
                          className="mt-1 w-full rounded-md border border-[#bdcaba] px-3 py-2 text-sm"
                          onChange={(e) => setVitalsStaffName(e.target.value)}
                          value={vitalsStaffName}
                        />
                      </label>
                      <div className="grid gap-3 md:grid-cols-2">
                        {vitalsForm.fields.map((field) => (
                          <label className="block text-xs font-semibold text-[#171d16]" key={field.key}>
                            {field.label} ({field.key})
                            <input
                              className="mt-1 w-full rounded-md border border-[#bdcaba] px-3 py-2 text-sm"
                              onChange={(e) =>
                                setVitalsValues((prev) => ({
                                  ...prev,
                                  [field.key]: e.target.value,
                                }))
                              }
                              placeholder={field.unit ? `Unit: ${field.unit}` : 'Enter value'}
                              value={vitalsValues[field.key] ?? ''}
                            />
                          </label>
                        ))}
                      </div>
                      <div className="relative z-10 pt-1">
                        <button
                          className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={vitalsSubmitting || !vitalsForm}
                          onClick={(ev) => void handleSubmitVitals(ev)}
                          type="button"
                        >
                          {vitalsSubmitting ? 'Submitting…' : 'Submit Vitals'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {!loading && tab === 'transcription' && (
                <div className="space-y-8 rounded-xl border border-[#bdcaba] bg-white p-8 text-sm text-[#3e4a3d] shadow-sm">
                  <header>
                    <h3 className="text-xl font-bold tracking-tight text-[#111827]">Audio transcription</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#575e70]">
                      Upload or record visit audio. When processing completes, the visit shows a{' '}
                      <strong className="font-semibold text-[#3e4a3d]">Doctor / Patient</strong> speaker dialogue (diarized
                      turns). If only raw speech-to-text exists, use <strong className="font-semibold">Generate dialogue</strong>{' '}
                      below (requires OpenAI on the server).
                    </p>
                  </header>

                  <section
                    className={`space-y-3 ${recordingPhase !== 'idle' || transcriptionUploading ? 'opacity-45' : ''}`}
                  >
                    <h4 className="text-sm font-bold tracking-tight text-[#111827]">Upload audio file</h4>
                    <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-stretch">
                      <div className="flex min-h-[52px] min-w-0 flex-1 items-center gap-3 rounded-xl border border-gray-200 bg-[#fafcf8] px-3 py-2 sm:px-4">
                        <input
                          ref={transcriptionFileInputRef}
                          accept="audio/*"
                          aria-label="Select audio file to transcribe"
                          className="fixed top-0 left-[-9999px] h-px w-px overflow-hidden opacity-0"
                          disabled={recordingPhase !== 'idle' || transcriptionUploading || !patientId || !visitId}
                          id="visit-transcription-file"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null
                            pendingTranscriptionAudioRef.current = file
                            setPendingTranscriptionAudio(file)
                          }}
                          tabIndex={-1}
                          type="file"
                        />
                        <label
                          className={`inline-flex shrink-0 cursor-pointer items-center rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-colors ${
                            recordingPhase !== 'idle' || transcriptionUploading || !patientId || !visitId
                              ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                              : 'bg-sky-100 text-sky-900 hover:bg-sky-200'
                          }`}
                          htmlFor="visit-transcription-file"
                          title={
                            recordingPhase !== 'idle'
                              ? 'Stop recording before choosing a file'
                              : transcriptionUploading
                                ? 'Wait for upload to finish'
                                : 'Browse for an audio file'
                          }
                        >
                          Choose file
                        </label>
                        <span className="min-w-0 truncate text-sm text-[#575e70]" title={pendingTranscriptionAudio?.name}>
                          {pendingTranscriptionAudio ? pendingTranscriptionAudio.name : 'No file chosen'}
                        </span>
                      </div>
                      <button
                        className="relative z-20 shrink-0 rounded-xl bg-[#16a34a] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#15803d] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                        disabled={
                          recordingPhase !== 'idle' ||
                          transcriptionUploading ||
                          !pendingTranscriptionAudio ||
                          !patientId ||
                          !visitId
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
                    {recordingPhase === 'idle' ? (
                      <button
                        className="flex min-h-[6.5rem] w-full flex-col items-center justify-center rounded-xl border-2 border-gray-200 bg-white px-6 py-10 text-[#111827] transition-colors hover:border-[#006b2c]/35 hover:bg-[#f8fdf6] disabled:cursor-not-allowed disabled:opacity-45"
                        disabled={!patientId || !visitId}
                        onClick={() => void handleStartRecording()}
                        type="button"
                      >
                        <span className="material-symbols-outlined mb-3 text-[32px] text-[#006b2c]" style={{ fontVariationSettings: "'FILL' 1" }}>
                          mic
                        </span>
                        <span className="text-[17px] font-semibold tracking-tight">Start recording</span>
                        <span className="mt-1 max-w-md text-xs font-normal text-[#575e70]">
                          Browser capture — pause or stop when the consultation ends; audio is transcribed automatically.
                        </span>
                      </button>
                    ) : (
                      <div className="space-y-3 rounded-xl border-2 border-[#006b2c]/25 bg-[#f8fdf6] p-6">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            className="rounded-xl border border-amber-700 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950"
                            onClick={() => handleStopRecording()}
                            type="button"
                          >
                            <span className="material-symbols-outlined mr-1 align-middle text-[18px]">stop_circle</span>
                            Stop and send for transcription
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
                            ? 'Recording… Speak clearly; waveform is not saved until you stop.'
                            : 'Paused — resume when ready, then stop to upload for transcription.'}
                        </p>
                      </div>
                    )}
                  </section>

                  {recordingError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{recordingError}</div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 border-t border-[#e9f0e5] pt-6">
                    <button
                      className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white"
                      onClick={() => void refreshTranscriptionStatus()}
                      disabled={!patientId || !visitId}
                      type="button"
                    >
                      Check transcription status
                    </button>
                  </div>
                  {transcriptionMessage && (
                    <p className="text-xs text-[#575e70]" role="status">
                      {transcriptionMessage}
                    </p>
                  )}
                  {transcriptionStatus && (
                    <div className="rounded-lg border border-[#bdcaba] bg-slate-50 p-4 text-xs">
                      <p className="font-medium text-[#171d16]">Status: {transcriptionStatus.status}</p>
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
                        <p className="text-[11px] text-[#575e70]">Doctor / Patient turns (diarized). Raw speech-to-text is not shown here.</p>
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
                    ) : (transcriptionStatus?.status || '').toLowerCase() === 'completed' &&
                      (transcriptionText?.length ?? 0) > 0 ? (
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
                        {(transcriptionStatus?.status || '').toLowerCase() === 'completed' ? (
                          <p>
                            No dialogue loaded. Click{' '}
                            <span className="font-semibold text-[#171d16]">Check transcription status</span> then refresh this
                            section.
                          </p>
                        ) : (transcriptionStatus?.status || '').toLowerCase() === 'failed' ? (
                          <p>Transcription failed — fix errors above, upload new audio, and try again.</p>
                        ) : (
                          <p>
                            Speaker dialogue appears when Azure Speech finishes and structuring completes. Poll with{' '}
                            <span className="font-semibold text-[#171d16]">Check transcription status</span>.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!loading && tab === 'clinical-note' && (
                <div className="mx-auto max-w-4xl space-y-6 rounded-xl border border-[#bdcaba] bg-white p-8">
                  <h3 className="text-[18px] font-semibold">Clinical Note</h3>
                  {!clinicalNote && (
                    <p className="text-sm text-[#3e4a3d]">
                      No saved clinical note for this visit yet. Generate one from the backend after transcription completes.
                    </p>
                  )}
                  {clinicalNote && (
                    <>
                      <section>
                        <h4 className="mb-2 font-semibold text-[#171d16]">Assessment</h4>
                        <p className="text-sm leading-relaxed text-[#3e4a3d]">{notePayload?.assessment ?? '—'}</p>
                      </section>
                      <section>
                        <h4 className="mb-2 font-semibold text-[#171d16]">Plan</h4>
                        <p className="text-sm leading-relaxed text-[#3e4a3d]">{notePayload?.plan ?? '—'}</p>
                      </section>
                      {notePayload?.rx && notePayload.rx.length > 0 && (
                        <section>
                          <h4 className="mb-2 font-semibold text-[#171d16]">Prescription</h4>
                          <ul className="list-inside list-disc text-sm text-[#3e4a3d]">
                            {notePayload.rx.map((r) => (
                              <li key={`${r.medicine_name}-${r.dose}`}>
                                {[r.medicine_name, r.dose, r.frequency, r.duration].filter(Boolean).join(' · ')}
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}
                    </>
                  )}
                </div>
              )}

              {!loading && tab === 'post-visit' && (
                <div className="mx-auto max-w-3xl space-y-6 rounded-xl border border-[#bdcaba] bg-white p-8 text-sm text-[#3e4a3d] shadow-sm">
                  <div>
                    <h3 className="text-lg font-semibold text-[#171d16]">Send post-visit recap</h3>
                    <p className="mt-1 text-xs text-[#575e70]">
                      Patient profile language does not change. Choose the language and number for this WhatsApp send.
                    </p>
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
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#575e70]">
                      Message language (patient)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ['hi', 'Hindi'] as const,
                          ['en', 'English'] as const,
                          ['hi-eng', 'Both'] as const,
                        ]
                      ).map(([code, label]) => (
                        <button
                          key={code}
                          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                            recapPatientLang === code
                              ? 'bg-[#006b2c] text-white'
                              : 'border border-[#bdcaba] bg-white text-[#171d16] hover:bg-[#eff6ea]'
                          }`}
                          onClick={() => setRecapPatientLang(code)}
                          type="button"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {postVisitSummary?.whatsapp_payload?.trim() && (
                    <div className="rounded-xl border border-[#62df7d]/40 bg-[#e8f8eb] p-4">
                      <p className="mb-2 text-xs font-semibold text-[#006b2c]">Preview</p>
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#171d16]">
                        {postVisitSummary.whatsapp_payload.trim()}
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
                            const res = await generatePostVisitSummary(patientId, visitId, {
                              preferred_language: recapPatientLang,
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
                      disabled={!patientId || !visitId || recapAction !== null}
                      onClick={() => {
                        if (!patientId || !visitId) return
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
                              preferred_language: recapPatientLang,
                            })
                            setPostVisitMessage(res.message)
                            const phoneDisplay =
                              recapContactMode === 'patient'
                                ? formatIndiaWhatsAppDisplay(visit?.patient?.phone_number ?? '')
                                : formatIndiaWhatsAppDisplay(overrideDigits)
                            setPostVisitSendInfo({
                              phoneDisplay,
                              languageDisplay: languageLabel(recapPatientLang),
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

                  {postVisitSummary?.payload && !postVisitSummary.whatsapp_payload?.trim() && (
                    <div className="space-y-2 rounded-lg border border-[#bdcaba] bg-slate-50 p-4 text-xs">
                      <p>
                        <strong>Visit reason:</strong> {postVisitSummary.payload.visit_reason || '—'}
                      </p>
                      <p>
                        <strong>Findings:</strong> {postVisitSummary.payload.what_doctor_found || '—'}
                      </p>
                      <p>
                        <strong>Follow-up:</strong> {postVisitSummary.payload.follow_up || '—'}
                      </p>
                    </div>
                  )}
                </div>
              )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <button
        className="fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#006b2c] text-white shadow-lg transition-transform hover:scale-110"
        type="button"
      >
        <span className="material-symbols-outlined">add</span>
      </button>

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}
