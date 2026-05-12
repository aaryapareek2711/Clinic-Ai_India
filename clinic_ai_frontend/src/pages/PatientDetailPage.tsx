import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ProviderHeaderProfileMenu from '../components/ProviderHeaderProfileMenu'
import { getApiErrorMessage } from '../lib/apiClient'
import { formatPatientDisplayId } from '../lib/patientDisplayId'
import {
  fetchPatientById,
  fetchPatientVisits,
  fetchPatients,
  patchPatient,
  type PatientSummary,
  type PatientVisit,
  type UpdatePatientPayload,
} from '../services/patientsApi'
import NotificationsDrawer from './NotificationsDrawer'

function badgeClasses(tone: string) {
  if (tone === 'amber') return 'bg-[#f59e0b]/10 text-[#f59e0b]'
  if (tone === 'blue') return 'bg-blue-100 text-blue-700'
  return 'bg-[#22c55e]/10 text-[#22c55e]'
}

function toneForStatus(status: string): 'green' | 'amber' | 'blue' {
  const s = status.toLowerCase()
  if (s === 'completed' || s === 'closed' || s === 'ended') return 'green'
  if (s === 'scheduled' || s === 'in_queue' || s === 'queued') return 'amber'
  return 'blue'
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function matchByVisibleSuffix(items: PatientSummary[], opaqueId: string): PatientSummary | null {
  const suffix = (opaqueId || '').trim().slice(-10)
  if (!suffix) return null
  return items.find((p) => (p.id || '').slice(-10) === suffix) ?? null
}

function PatientDetailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const patientId = searchParams.get('patientId')?.trim() ?? ''
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [patient, setPatient] = useState<PatientSummary | null>(null)
  const [visits, setVisits] = useState<PatientVisit[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [saveInfo, setSaveInfo] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftPhone, setDraftPhone] = useState('')
  const [draftAge, setDraftAge] = useState('')
  const [draftGender, setDraftGender] = useState('')

  useEffect(() => {
    if (!patientId) return
    let cancelled = false
    void (async () => {
      try {
        if (!cancelled) {
          setLoading(true)
          setError(null)
        }
        const [patientRes, visitRes] = await Promise.allSettled([fetchPatientById(patientId), fetchPatientVisits(patientId)])
        if (cancelled) return
        if (visitRes.status === 'fulfilled') setVisits(visitRes.value)
        else setVisits([])

        if (patientRes.status === 'fulfilled') {
          setPatient(patientRes.value ?? null)
          return
        }

        // Backward compatibility: if URL has an older opaque token, fallback by visible suffix.
        try {
          const allPatients = await fetchPatients()
          if (cancelled) return
          const matched = matchByVisibleSuffix(allPatients, patientId)
          setPatient(matched)
          if (!matched) setError(getApiErrorMessage(patientRes.reason))
        } catch (fallbackErr) {
          if (!cancelled) setError(getApiErrorMessage(fallbackErr))
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
  }, [patientId])

  const beginEdit = () => {
    if (!patient) return
    setDraftName(patient.full_name ?? '')
    setDraftPhone(patient.phone_number ?? '')
    setDraftAge(patient.age != null && patient.age !== undefined ? String(patient.age) : '')
    setDraftGender(patient.gender ?? '')
    setEditing(true)
    setError(null)
    setSaveInfo(null)
  }

  const cancelEdit = () => {
    setEditing(false)
  }

  const saveEdit = async () => {
    if (!patient) return
    const payload: UpdatePatientPayload = {}
    const nameTrim = draftName.trim()
    const phoneTrim = draftPhone.trim()
    if (nameTrim !== (patient.full_name ?? '').trim()) payload.name = nameTrim
    if (phoneTrim !== (patient.phone_number ?? '').trim()) payload.phone_number = phoneTrim
    const ageNum = Number.parseInt(String(draftAge).trim(), 10)
    if (String(draftAge).trim() !== '') {
      if (!Number.isFinite(ageNum) || ageNum < 0 || ageNum > 130) {
        setError('Enter a valid age (0–130) or leave blank to keep the current value.')
        return
      }
      if (patient.age !== ageNum) payload.age = ageNum
    }
    const genderTrim = draftGender.trim()
    if (genderTrim !== (patient.gender ?? '').trim()) payload.gender = genderTrim

    if (Object.keys(payload).length === 0) {
      setEditing(false)
      setSaveInfo(null)
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSaveInfo(null)
      const updated = await patchPatient(patient.patient_id || patientId, payload)
      setPatient(updated)
      setEditing(false)
      if (payload.phone_number != null) {
        setSaveInfo(
          'Phone number saved. Open WhatsApp intakes are resent to the new number when the clinic has messaging configured.',
        )
      } else {
        setSaveInfo(null)
      }
      const nextId = updated.patient_id?.trim()
      if (nextId && nextId !== patientId) {
        navigate(`/patients/detail?patientId=${encodeURIComponent(nextId)}`, { replace: true })
      }
    } catch (e) {
      setError(getApiErrorMessage(e))
      setSaveInfo(null)
    } finally {
      setSaving(false)
    }
  }

  const displayName = useMemo(() => patient?.full_name || 'Patient', [patient])
  const humanPatientId = useMemo(
    () => (patient ? formatPatientDisplayId(patient.full_name, patient.phone_number) : ''),
    [patient],
  )
  const ageGender = `${patient?.age ?? '—'} Yrs • ${patient?.gender ?? 'Unknown'}`

  return (
    <div className="text-[#171d16] min-h-screen font-manrope">
      <header className="h-16 sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md flex items-center justify-between px-8 w-full max-w-full">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-full text-sm focus:ring-2 focus:ring-teal-500/20 placeholder:text-slate-400" placeholder="Search records, appointments..." type="text" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="hover:bg-slate-100 rounded-full p-2 transition-all relative" onClick={() => setIsNotificationsOpen(true)} type="button">
            <span className="material-symbols-outlined text-slate-600">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>
          <div className="h-8 w-px bg-slate-200 mx-2" />
          <ProviderHeaderProfileMenu />
        </div>
      </header>

      <main className="p-8 min-h-[calc(100vh-4rem)]">
        <div className="flex items-center gap-2 mb-6">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
            <button className="hover:text-[#006b2c] transition-colors" onClick={() => navigate('/patients')} type="button">Patients</button>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-[#171d16] font-semibold">{displayName}</span>
          </nav>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
        {saveInfo && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{saveInfo}</div>
        )}

        <section className="bg-white rounded-xl border border-[#bdcaba] p-8 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-full opacity-[0.03] pointer-events-none">
            <span className="material-symbols-outlined text-[12rem] rotate-12">patient_list</span>
          </div>
          <div className="relative z-10 flex flex-wrap items-start justify-end gap-4 mb-6">
            {!editing ? (
              <button
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#bdcaba] bg-white px-4 py-2 text-sm font-semibold text-[#006b2c] hover:bg-slate-50 transition-colors disabled:opacity-50"
                disabled={!patient || loading}
                onClick={() => beginEdit()}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Edit details
              </button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-lg border border-[#bdcaba] bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                  disabled={saving}
                  onClick={() => cancelEdit()}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-lg bg-[#006b2c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005824] transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                  disabled={saving}
                  onClick={() => void saveEdit()}
                  type="button"
                >
                  {saving ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      Saving…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">save</span>
                      Save
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
          <div className="relative z-10 grid grid-cols-1 gap-6 lg:grid-cols-4">
            <div>
              {!editing ? (
                <>
                  <h2 className="text-[28px] leading-tight tracking-[-0.02em] font-bold mb-1">{displayName}</h2>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#d9dff5] text-[#5c6274] text-[11px] font-bold rounded uppercase tracking-wider">
                      {(patient?.gender || 'Unknown').toString()}
                    </span>
                    <span className="text-sm text-slate-500">Patient profile</span>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-[13px] tracking-[0.05em] font-medium text-slate-400 uppercase">Full name</span>
                    <input
                      className="mt-1 w-full max-w-md rounded-lg border border-[#bdcaba] px-3 py-2 text-base text-[#171d16] focus:border-[#006b2c] focus:ring-1 focus:ring-[#006b2c]/30"
                      onChange={(e) => setDraftName(e.target.value)}
                      type="text"
                      value={draftName}
                    />
                  </label>
                  <p className="text-xs text-slate-500">
                    Changing name or phone updates the internal patient key and linked visits stay attached.
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-[13px] tracking-[0.05em] font-medium text-slate-400 uppercase">Age &amp; Gender</p>
              {!editing ? (
                <p className="text-base text-[#171d16]">{ageGender}</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500">Age</span>
                    <input
                      className="w-24 rounded-lg border border-[#bdcaba] px-3 py-2 text-base text-[#171d16] focus:border-[#006b2c] focus:ring-1 focus:ring-[#006b2c]/30"
                      inputMode="numeric"
                      onChange={(e) => setDraftAge(e.target.value)}
                      placeholder="—"
                      type="text"
                      value={draftAge}
                    />
                  </label>
                  <label className="flex min-w-[140px] flex-1 flex-col gap-1">
                    <span className="text-xs text-slate-500">Gender</span>
                    <input
                      className="rounded-lg border border-[#bdcaba] px-3 py-2 text-base text-[#171d16] focus:border-[#006b2c] focus:ring-1 focus:ring-[#006b2c]/30"
                      onChange={(e) => setDraftGender(e.target.value)}
                      placeholder="e.g. female"
                      type="text"
                      value={draftGender}
                    />
                  </label>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-[13px] tracking-[0.05em] font-medium text-slate-400 uppercase">Patient ID</p>
              <div className="flex items-center gap-2">
                <p className="text-base text-[#171d16] break-all">{humanPatientId || '—'}</p>
                <button
                  className="text-teal-600 hover:bg-teal-50 p-1 rounded-md transition-colors shrink-0"
                  disabled={!humanPatientId}
                  onClick={() => {
                    if (humanPatientId) void navigator.clipboard.writeText(humanPatientId)
                  }}
                  type="button"
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[13px] tracking-[0.05em] font-medium text-slate-400 uppercase">Mobile Number</p>
              {!editing ? (
                <p className="text-base text-[#171d16]">{patient?.phone_number || '—'}</p>
              ) : (
                <input
                  className="mt-1 w-full max-w-xs rounded-lg border border-[#bdcaba] px-3 py-2 text-base text-[#171d16] focus:border-[#006b2c] focus:ring-1 focus:ring-[#006b2c]/30"
                  onChange={(e) => setDraftPhone(e.target.value)}
                  type="tel"
                  value={draftPhone}
                />
              )}
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-teal-600">history</span>
              <h3 className="text-[18px] leading-[1.4] font-semibold text-[#171d16]">Visit History</h3>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Filter by:</span>
              <select className="bg-white border border-[#bdcaba] rounded-lg text-sm py-1.5 pl-3 pr-8 focus:ring-[#006b2c] focus:border-[#006b2c]">
                <option>All Visits</option>
                <option>Completed</option>
                <option>Scheduled</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#bdcaba] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-[#bdcaba]">
                  <th className="px-6 py-4 text-[13px] tracking-[0.05em] font-medium text-slate-500 uppercase">Visit Title</th>
                  <th className="px-6 py-4 text-[13px] tracking-[0.05em] font-medium text-slate-500 uppercase">Date</th>
                  <th className="px-6 py-4 text-[13px] tracking-[0.05em] font-medium text-slate-500 uppercase">Department</th>
                  <th className="px-6 py-4 text-[13px] tracking-[0.05em] font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-[13px] tracking-[0.05em] font-medium text-slate-500 uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#bdcaba]">
                {visits.map((visit) => {
                  const goToVisit = () =>
                    navigate(`/visits/detail?visitId=${encodeURIComponent(visit.visit_id)}&tab=pre-visit`)
                  return (
                    <tr
                      key={visit.visit_id}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                      onClick={goToVisit}
                    >
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#171d16]">Visit #{visit.visit_id.slice(-6)}</span>
                          <span className="text-xs text-slate-400">{visit.status.replace(/_/g, ' ')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-600">{formatDate(visit.scheduled_start || visit.created_at)}</td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-medium text-slate-700">General</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${badgeClasses(toneForStatus(visit.status))}`}>
                          <span className={`w-1 h-1 rounded-full mr-1.5 ${toneForStatus(visit.status) === 'amber' ? 'bg-[#f59e0b]' : toneForStatus(visit.status) === 'green' ? 'bg-[#22c55e]' : 'bg-blue-500'}`} />
                          {visit.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button
                          className="text-[#006b2c] font-semibold text-sm hover:underline inline-flex items-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            goToVisit()
                          }}
                          type="button"
                        >
                          View Details
                          <span className="material-symbols-outlined text-xs">arrow_forward</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {!loading && visits.length === 0 && (
                  <tr>
                    <td className="px-6 py-8 text-center text-sm text-slate-500" colSpan={5}>
                      No visits found for this patient.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="px-6 py-4 bg-slate-50 border-t border-[#bdcaba] flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {loading ? 'Loading visits...' : `Showing ${visits.length} visit(s)`}
              </p>
              <div className="flex gap-2">
                <button className="p-1.5 rounded border border-[#bdcaba] bg-white text-slate-400 cursor-not-allowed" type="button">
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                <button className="p-1.5 rounded border border-[#bdcaba] bg-white text-[#171d16] hover:bg-slate-50 transition-colors" type="button">
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}

export default PatientDetailPage
