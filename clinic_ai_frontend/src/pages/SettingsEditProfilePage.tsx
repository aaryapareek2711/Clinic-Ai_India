import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_DOCTOR_SCHEDULE,
  getDoctorScheduleSettings,
  saveDoctorScheduleSettings,
} from '../lib/doctorScheduleSettings'
import { useNavigate } from 'react-router-dom'
import { getStoredAuthProfile } from '../lib/authSession'
import BackButton from '../components/BackButton'
import ProviderAvatar from '../components/ProviderAvatar'
import SettingsHeadingNav from '../components/SettingsHeadingNav'
import NotificationsDrawer from './NotificationsDrawer'
import { fetchMyProfile, getApiErrorMessage, patchMyProfile, type ProviderProfile } from '../services/profileApi'

function hasAuthToken(): boolean {
  if (typeof localStorage === 'undefined') return false
  return !!(localStorage.getItem('access_token') ?? localStorage.getItem('token'))
}

function profileStrengthPct(p: {
  full_name: string
  job_title: string
  phone: string
  medical_license_number: string
  avatar_url: string
}): number {
  let n = 0
  const checks = [
    p.full_name.trim(),
    p.job_title.trim(),
    p.phone.trim(),
    p.medical_license_number.trim(),
    p.avatar_url.trim(),
  ]
  for (const c of checks) {
    if (c) n += 1
  }
  return Math.round((n / checks.length) * 100)
}

type DayAvailability = {
  key: string
  closed: boolean
  startClock: string // "09:00" in 12-hour format (leading zero)
  startMeridiem: 'AM' | 'PM'
  endClock: string // "17:00" in 12-hour format (leading zero)
  endMeridiem: 'AM' | 'PM'
}

const DAY_OPTIONS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
]

const DAY_AVAILABILITY_LOCAL_KEY = 'doctor_day_availability_settings'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function split24hToClockAndMeridiem(hhmm24: string): { clock: string; meridiem: 'AM' | 'PM' } | null {
  const [hRaw, mRaw] = hhmm24.split(':')
  const h = Number(hRaw)
  const m = Number(mRaw)
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) return null
  const meridiem: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return { clock: `${pad2(h12)}:${pad2(m)}`, meridiem }
}

function MeridiemToggle({
  ariaLabel,
  disabled,
  onChange,
  value,
}: {
  ariaLabel: string
  disabled?: boolean
  onChange: (next: 'AM' | 'PM') => void
  value: 'AM' | 'PM'
}) {
  const btn = (period: 'AM' | 'PM') =>
    `min-w-[36px] px-2 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
      value === period ? 'bg-[#e9f0e5] text-[#006b2c]' : 'bg-white text-[#171d16] hover:bg-gray-50'
    }`
  return (
    <div aria-label={ariaLabel} className="inline-flex divide-x divide-gray-200 overflow-hidden rounded-md border border-gray-200" role="group">
      <button aria-pressed={value === 'AM'} className={btn('AM')} disabled={disabled} onClick={() => onChange('AM')} type="button">
        AM
      </button>
      <button aria-pressed={value === 'PM'} className={btn('PM')} disabled={disabled} onClick={() => onChange('PM')} type="button">
        PM
      </button>
    </div>
  )
}

function SettingsEditProfilePage() {
  const navigate = useNavigate()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const [fullName, setFullName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [emailDisplay, setEmailDisplay] = useState('')
  const [phone, setPhone] = useState('')
  const [license, setLicense] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [initialProfile, setInitialProfile] = useState<{
    fullName: string
    jobTitle: string
    phone: string
    license: string
    avatarUrl: string
  } | null>(null)
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [opdStart, setOpdStart] = useState(DEFAULT_DOCTOR_SCHEDULE.opdStart)
  const [opdEnd, setOpdEnd] = useState(DEFAULT_DOCTOR_SCHEDULE.opdEnd)
  const [addEveningShift, setAddEveningShift] = useState(DEFAULT_DOCTOR_SCHEDULE.addEveningShift)
  const [eveningStart, setEveningStart] = useState(DEFAULT_DOCTOR_SCHEDULE.eveningStart)
  const [eveningEnd, setEveningEnd] = useState(DEFAULT_DOCTOR_SCHEDULE.eveningEnd)
  const [defaultSlotMinutes, setDefaultSlotMinutes] = useState<number>(DEFAULT_DOCTOR_SCHEDULE.defaultSlotMinutes)

  const [dayAvailability, setDayAvailability] = useState<DayAvailability[]>(
    DAY_OPTIONS.map((d) => ({
      key: d.key,
      closed: ['wednesday', 'sunday'].includes(d.key),
      startClock: split24hToClockAndMeridiem(DEFAULT_DOCTOR_SCHEDULE.opdStart)?.clock ?? '09:00',
      startMeridiem: split24hToClockAndMeridiem(DEFAULT_DOCTOR_SCHEDULE.opdStart)?.meridiem ?? 'AM',
      endClock: split24hToClockAndMeridiem(DEFAULT_DOCTOR_SCHEDULE.opdEnd)?.clock ?? '06:00',
      endMeridiem: split24hToClockAndMeridiem(DEFAULT_DOCTOR_SCHEDULE.opdEnd)?.meridiem ?? 'PM',
    })),
  )

  const readPhone = (profile: ProviderProfile) => {
    const phoneNumber =
      typeof (profile as { phone_number?: unknown }).phone_number === 'string'
        ? (profile as { phone_number?: string }).phone_number
        : null
    return String(profile.phone ?? phoneNumber ?? '').trim()
  }

  const applyStoredFallbackProfile = useCallback(() => {
    const cached = getStoredAuthProfile()
    setFullName(cached.fullName || '')
    setJobTitle(cached.jobTitle || '')
    setEmailDisplay(cached.username?.includes('@') ? cached.username : '')
    setPhone('')
    setLicense('')
    setAvatarUrl('')
    setInitialProfile({
      fullName: cached.fullName || '',
      jobTitle: cached.jobTitle || '',
      phone: '',
      license: '',
      avatarUrl: '',
    })
  }, [])

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setBanner(null)
    if (!hasAuthToken()) {
      applyStoredFallbackProfile()
      setLoading(false)
      return
    }
    try {
      const me = await fetchMyProfile()
      setFullName(me.full_name ?? '')
      setJobTitle(me.job_title ?? '')
      setEmailDisplay(me.email ?? '')
      setPhone(readPhone(me))
      setLicense(me.medical_license_number ?? '')
      setAvatarUrl(me.avatar_url ?? '')
      setInitialProfile({
        fullName: me.full_name ?? '',
        jobTitle: me.job_title ?? '',
        phone: readPhone(me),
        license: me.medical_license_number ?? '',
        avatarUrl: me.avatar_url ?? '',
      })
    } catch {
      applyStoredFallbackProfile()
    } finally {
      setLoading(false)
    }
  }, [applyStoredFallbackProfile])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  useEffect(() => {
    const s = getDoctorScheduleSettings()
    setOpdStart(s.opdStart)
    setOpdEnd(s.opdEnd)
    setAddEveningShift(s.addEveningShift)
    setEveningStart(s.eveningStart)
    setEveningEnd(s.eveningEnd)
    setDefaultSlotMinutes(s.defaultSlotMinutes)

    // Load per-day availability UI settings (stored separately from OPD schedule).
    try {
      const raw = localStorage.getItem(DAY_AVAILABILITY_LOCAL_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as unknown
        if (Array.isArray(parsed)) {
          const normalized: DayAvailability[] = DAY_OPTIONS.map((d) => {
            const candidate = parsed.find((x) => (x as { key?: string }).key === d.key) as
              | {
                  key?: string
                  closed?: unknown
                  start?: unknown
                  end?: unknown
                  startClock?: unknown
                  startMeridiem?: unknown
                  endClock?: unknown
                  endMeridiem?: unknown
                }
              | undefined

            const closed = typeof candidate?.closed === 'boolean' ? candidate.closed : ['wednesday', 'sunday'].includes(d.key)

            const defaultStartSplit = split24hToClockAndMeridiem(s.opdStart) ?? { clock: '09:00', meridiem: 'AM' as const }
            const defaultEndSplit = split24hToClockAndMeridiem(s.opdEnd) ?? { clock: '06:00', meridiem: 'PM' as const }

            // Migrate old stored shape: { start: '09:00', end: '17:00' } (24h).
            const startSplit =
              typeof candidate?.start === 'string' ? split24hToClockAndMeridiem(candidate.start) : (null as ReturnType<typeof split24hToClockAndMeridiem>)
            const endSplit = typeof candidate?.end === 'string' ? split24hToClockAndMeridiem(candidate.end) : (null as ReturnType<typeof split24hToClockAndMeridiem>)

            const startClock = typeof candidate?.startClock === 'string' ? candidate.startClock : startSplit?.clock ?? defaultStartSplit.clock
            const startMeridiemRaw = typeof candidate?.startMeridiem === 'string' ? candidate.startMeridiem.toUpperCase() : null
            const startMeridiem: 'AM' | 'PM' = startMeridiemRaw === 'AM' || startMeridiemRaw === 'PM' ? startMeridiemRaw : startSplit?.meridiem ?? defaultStartSplit.meridiem

            const endClock = typeof candidate?.endClock === 'string' ? candidate.endClock : endSplit?.clock ?? defaultEndSplit.clock
            const endMeridiemRaw = typeof candidate?.endMeridiem === 'string' ? candidate.endMeridiem.toUpperCase() : null
            const endMeridiem: 'AM' | 'PM' = endMeridiemRaw === 'AM' || endMeridiemRaw === 'PM' ? endMeridiemRaw : endSplit?.meridiem ?? defaultEndSplit.meridiem

            return { key: d.key, closed, startClock, startMeridiem, endClock, endMeridiem }
          })
          setDayAvailability(normalized)
          return
        }
      }
    } catch {
      // fallthrough to defaults
    }

    setDayAvailability(
      DAY_OPTIONS.map((d) => ({
        key: d.key,
        closed: ['wednesday', 'sunday'].includes(d.key),
        startClock: split24hToClockAndMeridiem(s.opdStart)?.clock ?? '09:00',
        startMeridiem: split24hToClockAndMeridiem(s.opdStart)?.meridiem ?? 'AM',
        endClock: split24hToClockAndMeridiem(s.opdEnd)?.clock ?? '06:00',
        endMeridiem: split24hToClockAndMeridiem(s.opdEnd)?.meridiem ?? 'PM',
      })),
    )
  }, [])

  useEffect(() => {
    return () => {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl)
    }
  }, [previewBlobUrl])

  const avatarSrc = previewBlobUrl || avatarUrl.trim() || ''

  const strength = useMemo(
    () => profileStrengthPct({ full_name: fullName, job_title: jobTitle, phone, medical_license_number: license, avatar_url: avatarUrl }),
    [fullName, jobTitle, phone, license, avatarUrl],
  )

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBanner(null)
    saveDoctorScheduleSettings({
      opdStart,
      opdEnd,
      addEveningShift,
      eveningStart,
      eveningEnd,
      defaultSlotMinutes,
    })
    if (!fullName.trim()) {
      setBanner({ type: 'err', text: 'Full name is required.' })
      return
    }
    if (!hasAuthToken()) {
      setBanner({ type: 'ok', text: 'OPD settings saved locally. Sign in to save profile fields to server.' })
      return
    }
    const profileChanged =
      !initialProfile ||
      fullName.trim() !== initialProfile.fullName.trim() ||
      jobTitle.trim() !== initialProfile.jobTitle.trim() ||
      phone.trim() !== initialProfile.phone.trim() ||
      license.trim() !== initialProfile.license.trim() ||
      avatarUrl.trim() !== initialProfile.avatarUrl.trim()
    if (!profileChanged) {
      setBanner({ type: 'ok', text: 'OPD settings saved.' })
      return
    }
    setSaving(true)
    try {
      const updated = await patchMyProfile({
        full_name: fullName.trim(),
        phone: phone.trim(),
        job_title: jobTitle.trim(),
        medical_license_number: license.trim(),
        avatar_url: avatarUrl.trim(),
      })
      setFullName(updated.full_name ?? '')
      setJobTitle(updated.job_title ?? '')
      setEmailDisplay(updated.email ?? '')
      setPhone(readPhone(updated))
      setLicense(updated.medical_license_number ?? '')
      setAvatarUrl(updated.avatar_url ?? '')
      setInitialProfile({
        fullName: updated.full_name ?? '',
        jobTitle: updated.job_title ?? '',
        phone: readPhone(updated),
        license: updated.medical_license_number ?? '',
        avatarUrl: updated.avatar_url ?? '',
      })
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl)
      setPreviewBlobUrl(null)
      setBanner({ type: 'ok', text: 'Profile updated successfully.' })
      navigate('/settings')
    } catch (err) {
      setBanner({
        type: 'err',
        text: `OPD settings saved. Profile fields could not be updated right now (${getApiErrorMessage(err)}).`,
      })
    } finally {
      setSaving(false)
    }
  }

  function onPickPhoto() {
    fileInputRef.current?.click()
  }

  function onFileChange(files: FileList | null) {
    const file = files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setPreviewBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }

  return (
    <div className="font-manrope min-h-screen text-[#171d16] antialiased">
      <header className="fixed top-0 right-0 z-40 flex h-16 w-[calc(100%-240px)] items-center justify-between border-b border-gray-200 bg-white px-8">
        <div className="flex items-center gap-2">
          <BackButton className="-ml-2" to="/dashboard" />
          <h2 className="text-[28px] leading-[1.2] font-bold tracking-[-0.02em] text-[#171d16]">Settings</h2>
        </div>
        <div className="flex items-center gap-6">
          <button
            className="relative text-gray-500 transition-opacity hover:opacity-80"
            onClick={() => setIsNotificationsOpen(true)}
            type="button"
          >
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-[#ba1a1a]" />
          </button>
          <div className="h-8 w-px bg-gray-200" />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-[#171d16]">{fullName || 'Provider'}</p>
              <p className="text-xs text-gray-500">{jobTitle || 'Clinical role'}</p>
            </div>
            <ProviderAvatar
              className="border-2 border-[#00873a]"
              imageUrl={avatarSrc}
              label={fullName || 'Provider'}
              size="md"
            />
          </div>
        </div>
      </header>

      <main className="min-h-screen bg-[#f4fcf0]">
        <div className="mt-16 p-8">
          <div className="mx-auto max-w-6xl">
          <SettingsHeadingNav showHeading={false} />

          {banner ? (
            <div
              className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
                banner.type === 'ok'
                  ? 'border-green-200 bg-green-50 text-green-900'
                  : 'border-red-200 bg-red-50 text-red-900'
              }`}
              role="status"
            >
              {banner.text}
            </div>
          ) : null}

          <div className="grid grid-cols-12 gap-8">
            <section className="col-span-12 rounded-xl border border-[#bdcaba] bg-white p-8 lg:col-span-8">
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-[18px] font-semibold text-[#171d16]">Professional profile</h3>
                  <p className="mt-1 text-sm text-[#3e4a3d]">
                    Update how you appear to patients and your organization. Email is tied to your account.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <div className="relative">
                    <ProviderAvatar
                      className="border-4 border-[#eff6ea] shadow-sm"
                      imageUrl={avatarSrc}
                      label={fullName || 'Provider'}
                      size="lg"
                    />
                    <input
                      ref={fileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(ev) => onFileChange(ev.target.files)}
                      type="file"
                    />
                  </div>
                  <div className="space-y-2">
                    <button
                      className="flex items-center gap-1 rounded-lg border border-[#bdcaba] bg-white px-4 py-2 text-sm font-semibold text-[#171d16] transition hover:bg-[#f4fcf0]"
                      onClick={onPickPhoto}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-lg">photo_camera</span>
                      Change photo
                    </button>
                    <p className="max-w-[200px] text-[11px] leading-snug text-[#3e4a3d]">
                      Preview updates instantly. Persist a portrait by saving a secure image URL below.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-[13px] uppercase tracking-[0.05em] text-[#3e4a3d]" htmlFor="ep-full-name">
                      Full name
                    </label>
                    <input
                      className="w-full rounded-lg border border-[#bdcaba] bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]"
                      id="ep-full-name"
                      onChange={(ev) => setFullName(ev.target.value)}
                      value={fullName}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[13px] uppercase tracking-[0.05em] text-[#3e4a3d]" htmlFor="ep-title">
                      Specialization / Title
                    </label>
                    <input
                      className="w-full rounded-lg border border-[#bdcaba] bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]"
                      id="ep-title"
                      onChange={(ev) => setJobTitle(ev.target.value)}
                      placeholder="e.g. Chief Surgeon — Oncology"
                      value={jobTitle}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[13px] uppercase tracking-[0.05em] text-[#3e4a3d]" htmlFor="ep-email">
                      Email address
                    </label>
                    <input
                      className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-[#3e4a3d]"
                      disabled
                      id="ep-email"
                      readOnly
                      value={emailDisplay}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[13px] uppercase tracking-[0.05em] text-[#3e4a3d]" htmlFor="ep-phone">
                      Phone number
                    </label>
                    <input
                      className="w-full rounded-lg border border-[#bdcaba] bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]"
                      id="ep-phone"
                      onChange={(ev) => setPhone(ev.target.value)}
                      type="tel"
                      value={phone}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[13px] uppercase tracking-[0.05em] text-[#3e4a3d]" htmlFor="ep-license">
                      Medical registration / License no.
                    </label>
                    <input
                      className="w-full rounded-lg border border-[#bdcaba] bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]"
                      id="ep-license"
                      onChange={(ev) => setLicense(ev.target.value)}
                      value={license}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-[13px] uppercase tracking-[0.05em] text-[#3e4a3d]" htmlFor="ep-avatar-url">
                      Profile image URL
                    </label>
                    <input
                      className="w-full rounded-lg border border-[#bdcaba] bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]"
                      id="ep-avatar-url"
                      onChange={(ev) => setAvatarUrl(ev.target.value)}
                      placeholder="https://…"
                      type="url"
                      value={avatarUrl}
                    />
                  </div>
                </div>

                <div className="mt-8 rounded-xl border border-[#bdcaba] bg-[#f7faf4] p-4">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-[#171d16]">Availability Settings</p>
                  </div>

                  <div className="space-y-2">
                    {DAY_OPTIONS.map((d) => {
                      const row = dayAvailability.find((x) => x.key === d.key)
                      if (!row) return null
                      return (
                        <div key={d.key} className="rounded-lg border border-gray-100 bg-[#f8fbf7] p-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-[110px]">
                              <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">{d.label}</p>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                              <label className="flex items-center gap-2">
                                <input
                                  checked={row.closed}
                                  className="h-4 w-4 rounded border-gray-300 text-[#16a34a]"
                                  onChange={(ev) =>
                                    setDayAvailability((prev) => prev.map((x) => (x.key === d.key ? { ...x, closed: ev.target.checked } : x)))
                                  }
                                  type="checkbox"
                                />
                                <span className={row.closed ? 'font-semibold text-[#ba1a1a]' : 'font-semibold text-[#171d16]'}>Closed</span>
                              </label>

                              <div className="flex items-center gap-2">
                                <input
                                  aria-label={`${d.label} start time`}
                                  className="w-[92px] rounded-md border border-gray-200 bg-white px-2 py-1.5 text-[#171d16] disabled:opacity-60"
                                  disabled={row.closed}
                                  onChange={(ev) =>
                                    setDayAvailability((prev) => prev.map((x) => (x.key === d.key ? { ...x, startClock: ev.target.value } : x)))
                                  }
                                  placeholder="09:00"
                                  value={row.startClock}
                                />

                                <MeridiemToggle
                                  ariaLabel={`${d.label} start AM or PM`}
                                  disabled={row.closed}
                                  onChange={(next) =>
                                    setDayAvailability((prev) => prev.map((x) => (x.key === d.key ? { ...x, startMeridiem: next } : x)))
                                  }
                                  value={row.startMeridiem}
                                />

                                <span className="text-sm text-gray-500">to</span>

                                <input
                                  aria-label={`${d.label} end time`}
                                  className="w-[92px] rounded-md border border-gray-200 bg-white px-2 py-1.5 text-[#171d16] disabled:opacity-60"
                                  disabled={row.closed}
                                  onChange={(ev) =>
                                    setDayAvailability((prev) => prev.map((x) => (x.key === d.key ? { ...x, endClock: ev.target.value } : x)))
                                  }
                                  placeholder="05:00"
                                  value={row.endClock}
                                />

                                <MeridiemToggle
                                  ariaLabel={`${d.label} end AM or PM`}
                                  disabled={row.closed}
                                  onChange={(next) =>
                                    setDayAvailability((prev) => prev.map((x) => (x.key === d.key ? { ...x, endMeridiem: next } : x)))
                                  }
                                  value={row.endMeridiem}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                </div>

                <div className="mt-8 flex justify-end border-t border-gray-100 pt-6">
                  <button
                    className="flex items-center gap-2 rounded-lg bg-[#16a34a] px-8 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
                    disabled={saving || loading}
                    type="submit"
                  >
                    <span className="material-symbols-outlined text-lg">save</span>
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>
            </section>

            <aside className="col-span-12 space-y-6 lg:col-span-4">
              <div className="relative overflow-hidden rounded-xl bg-[#006b2c] p-6 text-white">
                <div className="relative z-10">
                  <h4 className="mb-2 text-xs uppercase tracking-wider text-white/85">Profile strength</h4>
                  <p className="mb-4 text-3xl font-bold">{strength}%</p>
                  <p className="text-sm leading-relaxed text-white/75">
                    {strength >= 100
                      ? 'Your clinician profile looks complete.'
                      : 'Add missing details so colleagues and integrations can trust your identity.'}
                  </p>
                </div>
                <div className="absolute -bottom-10 -right-8 opacity-[0.12]">
                  <span className="material-symbols-outlined text-[140px]">clinical_notes</span>
                </div>
              </div>

              <div className="rounded-xl border border-[#bdcaba] bg-white p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-[#171d16]">Completion checklist</h4>
                  <span className="material-symbols-outlined text-gray-400">fact_check</span>
                </div>
                <ul className="space-y-3 text-sm text-[#3e4a3d]">
                  <CheckRow done={!!fullName.trim()} label="Display name" />
                  <CheckRow done={!!jobTitle.trim()} label="Clinical title" />
                  <CheckRow done={!!phone.trim()} label="Reachable phone" />
                  <CheckRow done={!!license.trim()} label="Registration number" />
                  <CheckRow done={!!avatarUrl.trim() || !!previewBlobUrl} label="Profile photo" />
                </ul>
              </div>
            </aside>

            <section className="col-span-12 flex flex-col gap-4 rounded-xl border border-gray-100 bg-[#eff6ea] p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#00873a] shadow-sm">
                  <span className="material-symbols-outlined">verified_user</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#171d16]">Verification</p>
                  <p className="text-xs text-[#3e4a3d]">
                    National ID and clinic linkage can be reviewed under Organization and Integrations when enabled.
                  </p>
                </div>
              </div>
              <button className="shrink-0 text-xs font-semibold text-[#2563eb] hover:underline" type="button">
                View compliance notes
              </button>
            </section>
          </div>
          </div>
        </div>
      </main>

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}

function CheckRow({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={`material-symbols-outlined text-[1.125rem] ${done ? 'text-[#16a34a]' : 'text-gray-300'}`}
        style={{ fontVariationSettings: done ? "'FILL' 1" : undefined }}
      >
        {done ? 'check_circle' : 'radio_button_unchecked'}
      </span>
      <span className={done ? 'font-medium text-[#171d16]' : ''}>{label}</span>
    </li>
  )
}

export default SettingsEditProfilePage
