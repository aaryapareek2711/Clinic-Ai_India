import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProviderIdentity } from '../hooks/useProviderIdentity'
import { getStoredAuthProfile } from '../lib/authSession'
import { fetchMyProfile, getApiErrorMessage, type ProviderProfile } from '../services/profileApi'
import { DEFAULT_PROVIDER_ID, fetchProviderVisits, type ProviderVisitListItem } from '../services/visitWorkflowApi'
import SettingsHeadingNav from '../components/SettingsHeadingNav'
import NotificationsDrawer from './NotificationsDrawer'

type AvailabilityRange = {
  id: string
  fromDay: string
  toDay: string
  morningStart: string
  morningEnd: string
  eveningStart: string
  eveningEnd: string
}

function SettingsPage() {
  const navigate = useNavigate()
  const provider = useProviderIdentity()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [profile, setProfile] = useState<ProviderProfile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [visits, setVisits] = useState<ProviderVisitListItem[]>([])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const me = await fetchMyProfile()
        if (!cancelled) setProfile(me)
      } catch (e) {
        if (!cancelled) {
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
          } else {
            setProfileError(getApiErrorMessage(e))
          }
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

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

  const initials = useMemo(() => {
    const raw = profile?.full_name?.trim() || provider.displayName.replace(/^Dr\.\s*/i, '').trim()
    const parts = raw.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return 'DR'
  }, [profile?.full_name, provider.displayName])

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

  const [availabilityRanges, setAvailabilityRanges] = useState<AvailabilityRange[]>([
    {
      id: 'range-1',
      fromDay: 'monday',
      toDay: 'wednesday',
      morningStart: '09:00',
      morningEnd: '12:00',
      eveningStart: '15:00',
      eveningEnd: '18:00',
    },
    {
      id: 'range-2',
      fromDay: 'thursday',
      toDay: 'saturday',
      morningStart: '09:00',
      morningEnd: '12:00',
      eveningStart: '15:00',
      eveningEnd: '18:00',
    },
  ])
  const [closedDays, setClosedDays] = useState<string[]>(['wednesday', 'sunday'])
  const [availabilitySaved, setAvailabilitySaved] = useState<string | null>(null)

  return (
    <div className="text-[#171d16] antialiased min-h-screen font-manrope">
      <header className="fixed top-0 right-0 w-[calc(100%-240px)] h-16 bg-white border-b border-gray-200 flex items-center justify-end px-8 z-40">
        <div className="flex items-center gap-6">
          <button className="text-gray-500 hover:opacity-80 transition-opacity relative" onClick={() => setIsNotificationsOpen(true)} type="button">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-0 right-0 w-2 h-2 bg-[#ba1a1a] rounded-full" />
          </button>
          <div className="flex items-center gap-3 ml-2">
            <div className="text-right">
              <div className="text-sm font-semibold text-[#171d16]">{provider.displayName}</div>
              <div className="text-[11px] text-gray-500 uppercase font-bold tracking-tight">{provider.title}</div>
            </div>
            <img
              alt="Dr. Profile"
              className="w-10 h-10 rounded-full object-cover border-2 border-[#00873a]"
              src={provider.avatarUrl}
            />
          </div>
        </div>
      </header>

      <main className="min-h-screen bg-[#f4fcf0]">
        <div className="space-y-8 p-8 pt-24">
          <SettingsHeadingNav showTabs={false} variant="wide" />

          <section className="relative z-0 mx-auto max-w-7xl overflow-hidden rounded-2xl bg-gradient-to-r from-[#111827] to-[#1f2937] px-10 py-10 text-white shadow-lg">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-15%,rgba(34,197,94,0.1),transparent_50%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 top-8 h-[14rem] w-[14rem] rounded-full border border-white/[0.06] sm:h-[18rem] sm:w-[18rem]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent"
          />

          <div className="relative z-10 mx-auto max-w-7xl">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8 lg:gap-10">
                <div className="relative shrink-0">
                  <div className="flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-full bg-gradient-to-br from-[#22c55e] via-[#16a34a] to-[#2563eb] shadow-lg shadow-black/30 ring-2 ring-white/[0.12] ring-offset-2 ring-offset-[#111827] sm:h-24 sm:w-24">
                    <span className="select-none text-2xl font-bold tracking-tight text-white drop-shadow-sm sm:text-[1.75rem]">{initials}</span>
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
                      {provider.displayName}
                    </h1>
                    <span className="inline-flex shrink-0 items-center rounded-full border border-white/[0.12] bg-white/[0.08] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/95">
                      Active
                    </span>
                  </div>
                  <p className="mx-auto max-w-xl text-sm leading-snug text-slate-300 sm:mx-0">
                    {provider.title}
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
                <h3 className="text-[18px] leading-[1.4] font-semibold text-[#171d16] mb-4">Availability</h3>
                <div className="space-y-5">
                  {availabilityRanges.map((range, idx) => (
                    <div className="rounded-lg border border-gray-100 bg-[#f8fbf7] p-3" key={range.id}>
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Range {idx + 1}</p>
                        {availabilityRanges.length > 1 && (
                          <button
                            className="text-xs font-semibold text-[#ba1a1a] hover:underline"
                            onClick={() => setAvailabilityRanges((prev) => prev.filter((r) => r.id !== range.id))}
                            type="button"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[4.5rem_1fr_1fr]">
                          <span className="text-gray-500">Days</span>
                          <select
                            className="rounded-md border border-gray-200 px-2 py-1.5 text-[#171d16]"
                            onChange={(e) =>
                              setAvailabilityRanges((prev) =>
                                prev.map((r) => (r.id === range.id ? { ...r, fromDay: e.target.value } : r)),
                              )
                            }
                            value={range.fromDay}
                          >
                            {DAY_OPTIONS.map((d) => (
                              <option key={`${range.id}-from-${d.key}`} value={d.key}>
                                {d.label}
                              </option>
                            ))}
                          </select>
                          <select
                            className="rounded-md border border-gray-200 px-2 py-1.5 text-[#171d16]"
                            onChange={(e) =>
                              setAvailabilityRanges((prev) =>
                                prev.map((r) => (r.id === range.id ? { ...r, toDay: e.target.value } : r)),
                              )
                            }
                            value={range.toDay}
                          >
                            {DAY_OPTIONS.map((d) => (
                              <option key={`${range.id}-to-${d.key}`} value={d.key}>
                                {d.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[4.5rem_1fr_1fr]">
                          <span className="text-gray-500">Morning</span>
                          <input
                            className="rounded-md border border-gray-200 px-2 py-1.5 text-[#171d16]"
                            onChange={(e) =>
                              setAvailabilityRanges((prev) =>
                                prev.map((r) => (r.id === range.id ? { ...r, morningStart: e.target.value } : r)),
                              )
                            }
                            type="time"
                            value={range.morningStart}
                          />
                          <input
                            className="rounded-md border border-gray-200 px-2 py-1.5 text-[#171d16]"
                            onChange={(e) =>
                              setAvailabilityRanges((prev) =>
                                prev.map((r) => (r.id === range.id ? { ...r, morningEnd: e.target.value } : r)),
                              )
                            }
                            type="time"
                            value={range.morningEnd}
                          />
                        </div>
                        <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[4.5rem_1fr_1fr]">
                          <span className="text-gray-500">Evening</span>
                          <input
                            className="rounded-md border border-gray-200 px-2 py-1.5 text-[#171d16]"
                            onChange={(e) =>
                              setAvailabilityRanges((prev) =>
                                prev.map((r) => (r.id === range.id ? { ...r, eveningStart: e.target.value } : r)),
                              )
                            }
                            type="time"
                            value={range.eveningStart}
                          />
                          <input
                            className="rounded-md border border-gray-200 px-2 py-1.5 text-[#171d16]"
                            onChange={(e) =>
                              setAvailabilityRanges((prev) =>
                                prev.map((r) => (r.id === range.id ? { ...r, eveningEnd: e.target.value } : r)),
                              )
                            }
                            type="time"
                            value={range.eveningEnd}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-[#171d16] hover:bg-gray-50"
                    onClick={() =>
                      setAvailabilityRanges((prev) => [
                        ...prev,
                        {
                          id: `range-${Date.now()}`,
                          fromDay: 'monday',
                          toDay: 'monday',
                          morningStart: '09:00',
                          morningEnd: '12:00',
                          eveningStart: '15:00',
                          eveningEnd: '18:00',
                        },
                      ])
                    }
                    type="button"
                  >
                    <span className="material-symbols-outlined text-base">add</span>
                    Add Range
                  </button>
                  <div className="rounded-lg border border-gray-100 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Closed Days (Overrides ranges)</p>
                    <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                      {DAY_OPTIONS.map((d) => {
                        const checked = closedDays.includes(d.key)
                        return (
                          <label className="flex items-center gap-2" key={`closed-${d.key}`}>
                            <input
                              checked={checked}
                              className="h-4 w-4 rounded border-gray-300 text-[#16a34a]"
                              onChange={(e) =>
                                setClosedDays((prev) =>
                                  e.target.checked ? [...prev, d.key] : prev.filter((x) => x !== d.key),
                                )
                              }
                              type="checkbox"
                            />
                            <span className={checked ? 'font-semibold text-[#ba1a1a]' : 'text-[#171d16]'}>{d.label}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    {availabilitySaved ? <p className="text-xs text-[#15803d]">{availabilitySaved}</p> : <span />}
                    <button
                      className="rounded-lg bg-[#16a34a] px-4 py-2 text-xs font-semibold text-white hover:bg-[#15803d]"
                      onClick={() => setAvailabilitySaved('Availability updated')}
                      type="button"
                    >
                      Save Availability
                    </button>
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
                    <span className="material-symbols-outlined text-sm">info</span>
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
                    <span className="material-symbols-outlined text-sm">info</span>
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
                    <span className="material-symbols-outlined text-sm">info</span>
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
