import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { getApiErrorMessage } from '../lib/apiClient'
import {
  fetchIntakeSession,
  fetchLatestVitalsForVisit,
  fetchPreVisitSummary,
  fetchVisitDetail,
  type LatestVitalsResponse,
  type VisitDetailResponse,
} from '../services/visitWorkflowApi'
import type { IntakeSessionResponse, PreVisitSummaryResponse } from '../services/visitWorkflowApi'

import NotificationsDrawer from './NotificationsDrawer'

const PLACEHOLDER_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDuf-HN86fQgEHctIXwh9Z2w87vAKMWCHYzKZZvbLzbuloRusDAWwskLCOkxb-mmuQLRZnH0dw_PNN9K-1JcmklQAxhXkEPNRlylrN3Ag7hs080ROaWkl1ifzouS1DlIiZsDh63hw92ES8XthAQXplemwu2sckV9YybILuSaklmCdlZF6cc6Anda__Dv1XCO4ab-_kjSpfz46x_3hVdRJSrZsdjhkEM164UBAYqNcyZbQkMq8outewVuB46T2eUg_87XzTbNyfbO3E5i'

export default function CarePrepIntakeDetailPage() {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  /** Route param preserves legacy name `tokenKey` but carries `visit_id` */
  const { tokenKey } = useParams<{ tokenKey: string }>()
  const visitId = tokenKey?.trim() ?? ''
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visit, setVisit] = useState<VisitDetailResponse | null>(null)
  const [intake, setIntake] = useState<IntakeSessionResponse | null>(null)
  const [preVisit, setPreVisit] = useState<PreVisitSummaryResponse | null>(null)
  const [vitals, setVitals] = useState<LatestVitalsResponse | null>(null)

  useEffect(() => {
    if (!visitId) return
    let cancelled = false
    void (async () => {
      try {
        if (!cancelled) {
          setLoading(true)
          setError(null)
        }
        const v = await fetchVisitDetail(visitId)
        if (cancelled) return
        setVisit(v)
        const pid = v.patient_id
        const [intakeRes, preRes, vitalsRes] = await Promise.all([
          fetchIntakeSession(visitId).catch(() => null),
          fetchPreVisitSummary(pid, visitId).catch(() => null),
          fetchLatestVitalsForVisit(pid, visitId),
        ])
        if (!cancelled) {
          setIntake(intakeRes)
          setPreVisit(preRes)
          setVitals(vitalsRes)
        }
      } catch (e) {
        if (!cancelled) setError(getApiErrorMessage(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [visitId])

  const patientName = useMemo(() => {
    const fn = visit?.patient?.first_name?.trim() ?? ''
    const ln = visit?.patient?.last_name?.trim() ?? ''
    const full = `${fn} ${ln}`.trim()
    return full || 'Patient'
  }, [visit])

  const ageSexLine = useMemo(() => {
    const dob = visit?.patient?.date_of_birth
    const g = visit?.patient?.gender?.replace(/_/g, ' ') ?? '—'
    let yrs = '—'
    if (dob) {
      const y = new Date(dob).getFullYear()
      if (!Number.isNaN(y) && y > 1900) yrs = `${new Date().getFullYear() - y}`
    }
    return `${yrs} Years Old • ${g}`
  }, [visit])

  const chiefLabel = (
    visit?.chief_complaint?.trim() ||
    preVisit?.sections?.chief_complaint?.reason_for_visit?.trim() ||
    intake?.illness?.trim() ||
    'INTAKE REVIEW'
  ).toUpperCase()

  const intakeDateLine = useMemo(() => {
    const iso = intake?.updated_at ?? visit?.scheduled_start ?? null
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  }, [intake?.updated_at, visit])

  const allergiesDisplay = useMemo(() => {
    const raw = preVisit?.sections?.past_medical_history_allergies?.allergies?.trim()
    if (!raw) return []
    return raw
      .split(/[,;/]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6)
      .map((name) => ({ name, detail: 'From pre-visit summary', severity: 'low' as const }))
  }, [preVisit])

  const medicationsDisplay = useMemo(() => {
    const m = preVisit?.sections?.current_medication?.medications_or_home_remedies?.trim()
    if (!m) return []
    return [{ name: 'Medications / remedies', detail: m, badge: 'NOTED' as const }]
  }, [preVisit])

  const vitalsDisplay = useMemo(() => {
    if (!vitals?.values || Object.keys(vitals.values).length === 0) {
      return { bp: '—', hr: '—', subtitle: 'No vitals on file for this visit' }
    }
    const vals = vitals.values
    const bp =
      String(vals.blood_pressure_mmhg ?? vals.bp_mmhg ?? vals.bp ?? '') ||
      `${String(vals.systolic ?? '')}/${String(vals.diastolic ?? '')}`.replace(/^\/|\/$/g, '') ||
      '—'
    const hr = String(vals.heart_rate_bpm ?? vals.pulse_bpm ?? vals.hr ?? '—')
    return { bp: bp || '—', hr: hr || '—', subtitle: vitals.submitted_at ? `Recorded · ${vitals.submitted_at}` : 'Recorded vitals' }
  }, [vitals])

  if (!visitId) {
    return (
      <div className="p-8 pt-24">
        <p className="text-sm text-slate-600">Missing visit id.</p>
        <Link className="mt-4 inline-block font-semibold text-[#006b2c]" to="/careprep">Back</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f4fcf0] font-sans text-[#171d16] antialiased">
      <header className="fixed right-0 top-0 z-40 flex h-16 w-[calc(100%-240px)] items-center justify-between border-b border-slate-200 bg-white px-8">
        <div className="flex items-center gap-4">
          <Link className="text-lg font-bold tracking-tight text-slate-900" to="/careprep">
            MedGenie CarePrep
          </Link>
          <div className="mx-2 h-6 w-px bg-slate-200" />
          <div className="flex items-center gap-2 text-slate-500">
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-sm font-medium">Intake Summary</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <button
              aria-label="Open notifications"
              className="rounded-full p-2 text-slate-500 hover:bg-slate-50"
              onClick={() => setIsNotificationsOpen(true)}
              type="button"
            >
              <span className="material-symbols-outlined">notifications</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 pt-24">
        {loading && <p className="text-sm text-slate-600">Loading intake…</p>}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
            <button className="ml-4 font-semibold underline" onClick={() => navigate('/careprep')} type="button">
              Back
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="mb-8 flex flex-col items-start justify-between gap-6 rounded-xl border border-slate-200 bg-white p-6 md:flex-row md:items-center">
              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#d9dff5] shadow-sm">
                  <img alt="" className="h-full w-full object-cover" src={PLACEHOLDER_AVATAR} />
                </div>
                <div>
                  <h2 className="text-[28px] leading-[1.2] font-bold tracking-[-0.02em] text-[#171d16]">{patientName}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-[#404758]">
                    {ageSexLine.split(' • ').map((part, i) => (
                      <span key={part} className="flex items-center gap-x-4">
                        {i > 0 ? <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300" /> : null}
                        <span>{part.trim()}</span>
                      </span>
                    ))}
                    <span className="flex items-center gap-1.5 rounded-full bg-[#ffd9de] px-2.5 py-0.5 text-xs font-bold text-[#8a143c]">
                      <span className="material-symbols-outlined text-[14px]">warning</span>
                      {chiefLabel}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start gap-2 md:items-end">
                <div className="text-left md:text-right">
                  <p className="text-[13px] font-medium tracking-[0.05em] text-slate-500 uppercase">Updated</p>
                  <p className="text-[18px] leading-snug font-semibold text-[#171d16]">{intakeDateLine}</p>
                </div>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold tracking-wider text-[#006b2c] uppercase">
                  {(intake?.status || 'unknown').replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                    <h3 className="flex items-center gap-2 text-[18px] leading-snug font-semibold text-[#171d16]">
                      <span className="material-symbols-outlined text-[#006b2c]">chat_bubble</span>
                      Intake Q&amp;A Recap
                    </h3>
                  </div>
                  <div className="space-y-8 p-6">
                    {(intake?.question_answers?.length ?? 0) === 0 && (
                      <p className="text-sm text-[#575e70]">No intake answers stored for this visit yet.</p>
                    )}
                    {(intake?.question_answers ?? []).map((item, idx) => (
                      <div key={`${visitId}-qa-${idx}`} className="group">
                        <p className="mb-2 text-base font-bold text-slate-900">{item.question || 'Question'}</p>
                        <div className="ml-4 border-l-2 border-slate-100 pl-4 transition-colors group-hover:border-[#006b2c]">
                          <p className="font-body text-base leading-relaxed text-[#3e4a3d] italic">{item.answer || '—'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 bg-[#a72d51]/5 px-6 py-4">
                    <h3 className="flex items-center gap-2 text-[18px] font-semibold text-[#a72d51]">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                        health_and_safety
                      </span>
                      Safety Highlights
                    </h3>
                  </div>
                  <div className="space-y-6 p-6">
                    <div>
                      <label className="mb-3 block text-[13px] font-medium tracking-[0.05em] text-slate-500 uppercase">Allergies</label>
                      {allergiesDisplay.length === 0 ? (
                        <p className="text-sm text-[#575e70]">No structured allergies in pre-visit summary.</p>
                      ) : (
                        <div className="space-y-2">
                          {allergiesDisplay.map((a) => (
                            <div key={a.name} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                              <span className="material-symbols-outlined text-xl text-slate-400">info</span>
                              <div>
                                <p className="text-sm font-bold text-slate-700">{a.name}</p>
                                <p className="text-[11px] text-slate-500">{a.detail}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <hr className="border-slate-100" />
                    <div>
                      <label className="mb-3 block text-[13px] font-medium tracking-[0.05em] text-slate-500 uppercase">Medications context</label>
                      {medicationsDisplay.length === 0 ? (
                        <p className="text-sm text-[#575e70]">No medications captured in pre-visit summary.</p>
                      ) : (
                        <div className="space-y-3">
                          {medicationsDisplay.map((m) => (
                            <div key={m.name} className="flex justify-between gap-4">
                              <div>
                                <p className="text-sm font-bold text-slate-900">{m.name}</p>
                                <p className="text-[11px] text-slate-500">{m.detail}</p>
                              </div>
                              <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{m.badge}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <div className="rounded-xl bg-[#006b2c]/10 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-bold text-[#006b2c]">Last Vitals (submitted)</span>
                          <span className="text-[10px] text-[#006b2c]/70">{vitalsDisplay.subtitle}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase">BP / Pressure</p>
                            <p className="font-black text-sm text-slate-800">{vitalsDisplay.bp}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase">Heart rate</p>
                            <p className="font-black text-sm text-slate-800">{vitalsDisplay.hr}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8 mt-12 flex flex-col items-stretch justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/50 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4 text-slate-500">
                <span className="material-symbols-outlined">history</span>
                <span className="text-sm font-medium">Visit {visitId.slice(-8)} · open clinical workspace</span>
              </div>
              <div className="flex flex-wrap gap-4">
                <button
                  className="flex items-center gap-2 rounded-lg bg-[#006b2c] px-8 py-3 font-bold text-white transition-all hover:bg-[#00873a] active:scale-95"
                  onClick={() => navigate(`/visits/detail?visitId=${encodeURIComponent(visitId)}&tab=pre-visit`)}
                  type="button"
                >
                  <span className="material-symbols-outlined">edit_note</span>
                  Open visit workspace
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}
