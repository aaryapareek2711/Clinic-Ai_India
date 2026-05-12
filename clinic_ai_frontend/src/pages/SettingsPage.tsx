import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProviderIdentity } from '../hooks/useProviderIdentity'
import { doctorNameLabel } from '../lib/doctorDisplayName'
import { getStoredAuthProfile } from '../lib/authSession'
import { getDoctorScheduleSettings, type OpdDayKey } from '../lib/doctorScheduleSettings'
import { effectiveDayRow } from '../lib/opdWeeklySchedule'
import { fetchMyProfile, getApiErrorMessage, PROVIDER_PROFILE_UPDATED_EVENT, type ProviderProfile } from '../services/profileApi'
import { DEFAULT_PROVIDER_ID, fetchProviderVisits, type ProviderVisitListItem } from '../services/visitWorkflowApi'
import BackButton from '../components/BackButton'
import ProviderHeaderProfileMenu from '../components/ProviderHeaderProfileMenu'
import NotificationsDrawer from './NotificationsDrawer'

type DayAvailability = {
  key: string
  closed: boolean
  morningLabel: string
  eveningLabel: string
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function formatTimeLabel(hhmm: string): string {
  const [hRaw, mRaw] = hhmm.split(':')
  const h = Number(hRaw)
  const m = Number(mRaw)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm
  const period = h >= 12 ? 'PM' : 'AM'
  const hr12 = h % 12 === 0 ? 12 : h % 12
  return `${hr12}:${pad2(m)} ${period}`
}

function SettingsPage() {
  const navigate = useNavigate()
  const provider = useProviderIdentity()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [profile, setProfile] = useState<ProviderProfile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [visits, setVisits] = useState<ProviderVisitListItem[]>([])
  const [scheduleRefresh, setScheduleRefresh] = useState(0)

  const loadProfile = useCallback(async () => {
    try {
      const me = await fetchMyProfile()
      setProfile(me)
      setProfileError(null)
      setScheduleRefresh((s) => s + 1)
    } catch (e) {
      const cached = getStoredAuthProfile()
      if (cached.fullName || cached.username || cached.jobTitle) {
        const fallbackProfile: ProviderProfile = {
          id: '',
          email: cached.username.includes('@') ? cached.username : '',
          username: cached.username,
          full_name: cached.fullName,
          phone: null,
          role: cached.role || 'doctor',
          job_title: cached.jobTitle || null,
          medical_license_number: null,
          avatar_url: null,
          is_active: true,
          is_verified: true,
          tenant_id: null,
        }
        setProfile(fallbackProfile)
        setProfileError(null)
        setScheduleRefresh((s) => s + 1)
      } else {
        setProfileError(getApiErrorMessage(e))
      }
    }
  }, [])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  useEffect(() => {
    const onProfileUpdated = () => {
      void loadProfile()
      setScheduleRefresh((s) => s + 1)
    }
    window.addEventListener(PROVIDER_PROFILE_UPDATED_EVENT, onProfileUpdated)
    return () => window.removeEventListener(PROVIDER_PROFILE_UPDATED_EVENT, onProfileUpdated)
  }, [loadProfile])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const rows = await fetchProviderVisits(DEFAULT_PROVIDER_ID)
        if (!cancelled) setVisits(rows)
      } catch {
        // Keep cards usable with fallback placeholders if stats API fails.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  /** Prefer `profile` from `/api/auth/me` so the hero matches saved edits (hook can lag behind cache). */
  const headerDisplayName = useMemo(() => {
    const raw = profile?.full_name?.trim()
    if (raw) return doctorNameLabel(raw)
    return provider.displayName
  }, [profile?.full_name, provider.displayName])

  const headerTitle = useMemo(
    () => profile?.job_title?.trim() || provider.title,
    [profile?.job_title, provider.title],
  )

  const headerAvatarUrl = useMemo(() => {
    const u = profile?.avatar_url?.trim()
    if (u) return u
    return provider.avatarUrl
  }, [profile?.avatar_url, provider.avatarUrl])

  const heroAvatarUrl = headerAvatarUrl?.trim() || ''

  const email = profile?.email?.trim() || '—'
  const phone =
    ((profile as unknown as { phone_number?: string | null })?.phone_number || profile?.phone || '').trim() || '—'
  const regNo = profile?.medical_license_number?.trim() || 'Not set'
  const siteLabel = profile?.tenant_id?.trim() || 'Not set'
  const stats = useMemo(() => {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()
    const inCurrentMonth = (iso?: string | null) => {
      if (!iso) return false
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return false
      return d.getMonth() === month && d.getFullYear() === year
    }
    const monthVisits = visits.filter((v) => inCurrentMonth(v.scheduled_start || v.created_at || null))
    const monthPatientIds = new Set<string>()
    for (const v of monthVisits) {
      const pid = (v.patient_id || '').trim()
      if (pid) monthPatientIds.add(pid)
    }
    let durationTotal = 0
    let durationCount = 0
    for (const v of monthVisits) {
      const explicit = typeof v.duration_minutes === 'number' ? v.duration_minutes : null
      if (explicit && explicit > 0) {
        durationTotal += explicit
        durationCount += 1
        continue
      }
      if (v.actual_start && v.actual_end) {
        const startMs = new Date(v.actual_start).getTime()
        const endMs = new Date(v.actual_end).getTime()
        const mins = Math.round((endMs - startMs) / 60000)
        if (Number.isFinite(mins) && mins > 0) {
          durationTotal += mins
          durationCount += 1
        }
      }
    }
    const avgConsultMins = durationCount ? Math.round(durationTotal / durationCount) : null
    return {
      patientsThisMonth: monthPatientIds.size,
      visitsThisMonth: monthVisits.length,
      avgConsultMins,
    }
  }, [visits])
  const DAY_OPTIONS = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ]

  const dayAvailability = useMemo<DayAvailability[]>(() => {
    const schedule = getDoctorScheduleSettings()
    return DAY_OPTIONS.map((d) => {
      const row = effectiveDayRow(schedule, d.key as OpdDayKey)
      return {
        key: d.key,
        closed: row.closed,
        morningLabel: row.closed ? 'Closed' : `${formatTimeLabel(row.morningStart)} to ${formatTimeLabel(row.morningEnd)}`,
        eveningLabel: row.closed ? '—' : row.eveningEnabled ? `${formatTimeLabel(row.eveningStart)} to ${formatTimeLabel(row.eveningEnd)}` : 'Not available',
      }
    })
  }, [scheduleRefresh, profile?.id])

  return (
    <div className="text-[#171d16] antialiased min-h-screen font-manrope">
      <header className="fixed top-0 right-0 w-[calc(100%-240px)] h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-40">
        <div className="flex items-center gap-2">
          <BackButton to="/dashboard" className="-ml-2" />
          <h2 className="text-[28px] leading-[1.2] font-bold tracking-[-0.02em] text-[#171d16]">Settings</h2>
        </div>
        <div className="flex items-center gap-6">
          <button className="text-gray-500 hover:opacity-80 transition-opacity relative" onClick={() => setIsNotificationsOpen(true)} type="button">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-0 right-0 w-2 h-2 bg-[#ba1a1a] rounded-full" />
          </button>
          <ProviderHeaderProfileMenu className="ml-2" />
        </div>
      </header>

      <main className="min-h-screen bg-[#f4fcf0]">
        <div className="space-y-8 p-8 pt-24">
          <p className="text-[#3e4a3d]">Manage your clinical profile, organization data, and medical team.</p>

          <section className="relative z-0 mx-auto max-w-7xl overflow-hidden rounded-2xl bg-gradient-to-r from-[#111827] to-[#1f2937] px-10 py-10 text-white shadow-lg">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-15%,rgba(34,197,94,0.1),transparent_50%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"
          />

          <div className="relative z-10 mx-auto max-w-7xl">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8 lg:gap-10">
                <div className="relative shrink-0">
                  <div className="flex h-[5.5rem] w-[5.5rem] items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#22c55e] via-[#16a34a] to-[#2563eb] shadow-lg shadow-black/30 ring-2 ring-white/[0.12] ring-offset-2 ring-offset-[#111827] sm:h-24 sm:w-24">
                    {heroAvatarUrl ? (
                      <img alt="" className="h-full w-full object-cover" src={heroAvatarUrl} />
                    ) : (
                      <span
                        aria-hidden
                        className="material-symbols-outlined select-none text-5xl text-white/95 drop-shadow-sm sm:text-6xl"
                      >
                        person
                      </span>
                    )}
                  </div>
                  <span
                    aria-label="Verified profile"
                    className="material-symbols-outlined absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#0f172a] bg-[#14532d] text-[14px] text-emerald-200 shadow sm:h-7 sm:w-7 sm:text-[15px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    verified
                  </span>
                </div>

                <div className="min-w-0 flex-1 space-y-1.5 text-center sm:text-left">
                  <div className="flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-start sm:gap-x-3">
                    <h1 className="text-balance text-xl font-bold tracking-tight sm:text-2xl md:text-[1.75rem]">
                      {headerDisplayName}
                    </h1>
                    <span className="inline-flex shrink-0 items-center rounded-full border border-white/[0.12] bg-white/[0.08] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/95">
                      Active
                    </span>
                  </div>
                  <p className="mx-auto max-w-xl text-sm leading-snug text-slate-300 sm:mx-0">
                    {headerTitle}
                  </p>
                  <dl className="mx-auto mt-3 flex max-w-xl flex-col gap-2 sm:mx-0 sm:flex-row sm:flex-wrap">
                    <div className="flex flex-1 justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 backdrop-blur-sm sm:flex-initial sm:justify-start">
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined mt-px text-[1rem] text-emerald-300/90">badge</span>
                        <div className="min-w-0 text-left leading-tight">
                          <dt className="sr-only">Registration number</dt>
                          <dd className="text-[12px] font-medium text-white/95">{regNo}</dd>
                          <dd className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Reg. no.</dd>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-1 justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 backdrop-blur-sm sm:flex-initial sm:justify-start">
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined mt-px text-[1rem] text-emerald-300/90">location_on</span>
                        <div className="min-w-0 text-left leading-tight">
                          <dt className="sr-only">Primary site</dt>
                          <dd className="text-[12px] font-medium text-white/95">{siteLabel}</dd>
                          <dd className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Site</dd>
                        </div>
                      </div>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-end">
                <button
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#16a34a] px-4 text-[13px] font-semibold text-white shadow-md shadow-emerald-950/25 transition hover:bg-[#15803d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
                  onClick={() => navigate('/settings/edit-profile')}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[1.125rem]">edit</span>
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
          </section>

          <section className="relative z-10 mx-auto max-w-7xl pb-12">
          {profileError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{profileError}</div>
          )}
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <div className="bg-white border border-gray-200 rounded-xl p-8 transition-shadow">
                <h3 className="text-[18px] leading-[1.4] font-semibold text-[#171d16] mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#006b2c]">info</span>
                  Professional Identity
                </h3>
                <div className="space-y-6">
                  <div className="group">
                    <label className="text-[13px] tracking-[0.05em] text-gray-400 block mb-1">EMAIL ADDRESS</label>
                    <div className="flex items-center gap-3 text-[#171d16] font-medium">
                      <span className="material-symbols-outlined text-gray-400 group-hover:text-[#006b2c] transition-colors">mail</span>
                      {email}
                    </div>
                  </div>
                  <div className="group">
                    <label className="text-[13px] tracking-[0.05em] text-gray-400 block mb-1">PHONE NUMBER</label>
                    <div className="flex items-center gap-3 text-[#171d16] font-medium">
                      <span className="material-symbols-outlined text-gray-400 group-hover:text-[#006b2c] transition-colors">call</span>
                      {phone}
                    </div>
                  </div>
                  <div className="group">
                    <label className="text-[13px] tracking-[0.05em] text-gray-400 block mb-1">PRIMARY CLINIC</label>
                    <div className="flex items-center gap-3 text-[#171d16] font-medium">
                      <span className="material-symbols-outlined text-gray-400 group-hover:text-[#006b2c] transition-colors">home_health</span>
                      {siteLabel}
                    </div>
                  </div>
                  <hr className="border-gray-100" />
                  <div className="flex items-center justify-between p-4 bg-[#006b2c]/5 rounded-lg border border-[#006b2c]/10">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#006b2c]" style={{ fontVariationSettings: "'FILL' 1" }}>link</span>
                      <div>
                        <div className="text-sm font-bold text-[#006b2c] leading-none">ABHA Linked</div>
                        <div className="text-[11px] text-[#006b2c]/70 mt-1 uppercase tracking-wider">National Health Stack</div>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-[#006b2c]">check_circle</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-8">
                <h3 className="text-[18px] leading-[1.4] font-semibold text-[#171d16] mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#006b2c]">schedule</span>
                  Availability Settings
                </h3>
                <div className="space-y-5">
                  <div className="rounded-lg border border-gray-100 bg-[#f8fbf7] p-4">
                    <div className="space-y-3">
                      {DAY_OPTIONS.map((d) => {
                        const row = dayAvailability.find((x) => x.key === d.key)
                        if (!row) return null
                        return (
                          <div key={d.key} className="flex flex-col gap-2 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-[120px]">
                              <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">{d.label}</p>
                            </div>

                            <div className="min-w-0 flex-1 space-y-1 text-sm sm:text-right">
                              <div>
                                <span className="mr-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Shift 1</span>
                                <span className={`font-medium ${row.closed ? 'text-[#ba1a1a]' : 'text-[#171d16]'}`}>{row.morningLabel}</span>
                              </div>
                              <div>
                                <span className="mr-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Shift 2</span>
                                <span
                                  className={`font-medium ${
                                    row.closed
                                      ? 'text-gray-400'
                                      : row.eveningLabel === 'Not available'
                                        ? 'text-[#ba1a1a]'
                                        : 'text-[#171d16]'
                                  }`}
                                >
                                  {row.eveningLabel}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col justify-center text-center">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined">groups</span>
                  </div>
                  <div className="text-3xl font-extrabold text-[#171d16]">{stats.patientsThisMonth}</div>
                  <div className="text-[13px] tracking-[0.05em] text-gray-500 mt-1">PATIENTS THIS MONTH</div>
                  <div className="mt-4 flex items-center justify-center text-xs text-gray-500 font-bold">
                    Based on visits in current month
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col justify-center text-center">
                  <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined">stethoscope</span>
                  </div>
                  <div className="text-3xl font-extrabold text-[#171d16]">{stats.visitsThisMonth}</div>
                  <div className="text-[13px] tracking-[0.05em] text-gray-500 mt-1">VISITS THIS MONTH</div>
                  <div className="mt-4 flex items-center justify-center text-xs text-gray-500 font-bold">
                    Based on scheduled/current month rows
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col justify-center text-center">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined">avg_time</span>
                  </div>
                  <div className="text-3xl font-extrabold text-[#171d16]">
                    {stats.avgConsultMins === null ? '—' : `${stats.avgConsultMins} min`}
                  </div>
                  <div className="text-[13px] tracking-[0.05em] text-gray-500 mt-1">AVG CONSULT TIME</div>
                  <div className="mt-4 flex items-center justify-center text-xs text-gray-500 font-bold">
                    Average from completed month visits
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-[18px] leading-[1.4] font-semibold text-[#171d16]">Recent Activity Feed</h3>
                  <button className="text-sm font-bold text-[#2563eb] hover:underline" type="button">View All Logs</button>
                </div>
                <div className="divide-y divide-gray-50">
                  <div className="p-6 hover:bg-[#f4fcf0] transition-colors flex gap-6">
                    <div className="mt-1">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined">clinical_notes</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-[#171d16]">OPD Note Generated</span>
                        <span className="text-xs text-gray-400">12 mins ago</span>
                      </div>
                      <p className="text-sm text-gray-600">Patient: <span className="font-medium text-[#171d16]">Anita Sharma (ID: #GN7721)</span>. Consultation for chemotherapy follow-up completed and synced to ABHA.</p>
                      <div className="mt-3 flex gap-2">
                        <span className="px-2 py-0.5 bg-blue-100/50 text-blue-700 rounded text-[11px] font-bold">OPD NOTE</span>
                        <span className="px-2 py-0.5 bg-green-100/50 text-green-700 rounded text-[11px] font-bold">SYNCED</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 hover:bg-[#f4fcf0] transition-colors flex gap-6">
                    <div className="mt-1">
                      <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined">science</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-[#171d16]">Lab Result Uploaded</span>
                        <span className="text-xs text-gray-400">2 hours ago</span>
                      </div>
                      <p className="text-sm text-gray-600">Complete Blood Count (CBC) results uploaded for <span className="font-medium text-[#171d16]">Vikram Mehra</span>. Flagged: Low Platelet Count.</p>
                      <div className="mt-3 flex gap-2">
                        <span className="px-2 py-0.5 bg-purple-100/50 text-purple-700 rounded text-[11px] font-bold">LAB REPORT</span>
                        <span className="px-2 py-0.5 bg-[#ba1a1a]/10 text-[#ba1a1a] rounded text-[11px] font-bold uppercase">Critical Flag</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 hover:bg-[#f4fcf0] transition-colors flex gap-6">
                    <div className="mt-1">
                      <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined">history_edu</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-[#171d16]">Digital Prescription Issued</span>
                        <span className="text-xs text-gray-400">4 hours ago</span>
                      </div>
                      <p className="text-sm text-gray-600">Prescribed <span className="italic">Doxorubicin regimen</span> for Patient: <span className="font-medium text-[#171d16]">Sunil Gupta</span>.</p>
                      <div className="mt-3 flex gap-2">
                        <span className="px-2 py-0.5 bg-amber-100/50 text-amber-700 rounded text-[11px] font-bold uppercase">Prescription</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 text-center">
                  <button className="text-sm font-semibold text-gray-500 flex items-center justify-center gap-2 mx-auto hover:text-[#171d16] transition-colors" type="button">
                    <span className="material-symbols-outlined text-sm">expand_more</span>
                    Load Older Activities
                  </button>
                </div>
              </div>
            </div>
          </div>
          </section>
        </div>
      </main>

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}

export default SettingsPage
