import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_DOCTOR_SCHEDULE,
  getDoctorScheduleSettings,
  OPD_DAY_KEYS,
  saveDoctorScheduleSettings,
  type DoctorScheduleSettings,
  type OpdDayKey,
  type OpdDayScheduleRow,
} from '../lib/doctorScheduleSettings'
import { clockPartsFrom24h, effectiveDayRow, pad2, to24h } from '../lib/opdWeeklySchedule'
import { useNavigate } from 'react-router-dom'
import { getStoredAuthProfile } from '../lib/authSession'
import BackButton from '../components/BackButton'
import ProviderAvatar from '../components/ProviderAvatar'
import SettingsHeadingNav from '../components/SettingsHeadingNav'
import NotificationsDrawer from './NotificationsDrawer'
import {
  fetchMyProfile,
  getApiErrorMessage,
  patchMyProfile,
  type OpdWeeklyDayPayload,
  type ProviderProfile,
} from '../services/profileApi'

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

type ClockParts = { h12: number; mm: string; mer: 'AM' | 'PM' }

type WeeklyDayUi = {
  key: OpdDayKey
  closed: boolean
  morningStart: ClockParts
  morningEnd: ClockParts
  eveningEnabled: boolean
  eveningStart: ClockParts
  eveningEnd: ClockParts
}

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const
const MINUTES_OPTS = Array.from({ length: 60 }, (_, i) => pad2(i))

const DAY_OPTIONS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
]

function scheduleToWeeklyUi(schedule: DoctorScheduleSettings): WeeklyDayUi[] {
  return OPD_DAY_KEYS.map((dayKey) => {
    const eff = effectiveDayRow(schedule, dayKey)
    return {
      key: dayKey,
      closed: eff.closed,
      morningStart: clockPartsFrom24h(eff.morningStart),
      morningEnd: clockPartsFrom24h(eff.morningEnd),
      eveningEnabled: eff.eveningEnabled,
      eveningStart: clockPartsFrom24h(eff.eveningStart),
      eveningEnd: clockPartsFrom24h(eff.eveningEnd),
    }
  })
}

function weeklyUiToPayload(rows: WeeklyDayUi[]): OpdWeeklyDayPayload[] {
  return rows.map((r) => ({
    day: r.key,
    closed: r.closed,
    morning_start: r.closed ? null : to24h(r.morningStart.h12, r.morningStart.mm, r.morningStart.mer),
    morning_end: r.closed ? null : to24h(r.morningEnd.h12, r.morningEnd.mm, r.morningEnd.mer),
    evening_enabled: !r.closed && r.eveningEnabled,
    evening_start: r.closed || !r.eveningEnabled ? null : to24h(r.eveningStart.h12, r.eveningStart.mm, r.eveningStart.mer),
    evening_end: r.closed || !r.eveningEnabled ? null : to24h(r.eveningEnd.h12, r.eveningEnd.mm, r.eveningEnd.mer),
  }))
}

function weeklyUiToStoredRows(rows: WeeklyDayUi[]): OpdDayScheduleRow[] {
  return rows.map((r) => ({
    day: r.key,
    closed: r.closed,
    morningStart: r.closed ? DEFAULT_DOCTOR_SCHEDULE.opdStart : to24h(r.morningStart.h12, r.morningStart.mm, r.morningStart.mer),
    morningEnd: r.closed ? DEFAULT_DOCTOR_SCHEDULE.opdEnd : to24h(r.morningEnd.h12, r.morningEnd.mm, r.morningEnd.mer),
    eveningEnabled: !r.closed && r.eveningEnabled,
    eveningStart:
      r.closed || !r.eveningEnabled
        ? DEFAULT_DOCTOR_SCHEDULE.eveningStart
        : to24h(r.eveningStart.h12, r.eveningStart.mm, r.eveningStart.mer),
    eveningEnd:
      r.closed || !r.eveningEnabled
        ? DEFAULT_DOCTOR_SCHEDULE.eveningEnd
        : to24h(r.eveningEnd.h12, r.eveningEnd.mm, r.eveningEnd.mer),
  }))
}

function TimeTripleSelect({
  disabled,
  idPrefix,
  onChange,
  value,
}: {
  disabled?: boolean
  idPrefix: string
  onChange: (next: ClockParts) => void
  value: ClockParts
}) {
  const sel =
    'rounded-md border border-gray-200 bg-white px-1.5 py-1.5 text-sm text-[#171d16] disabled:cursor-not-allowed disabled:opacity-60'
  return (
    <div className="flex flex-wrap items-center gap-1">
      <select
        aria-label={`${idPrefix} hour`}
        className={sel}
        disabled={disabled}
        id={`${idPrefix}-h`}
        onChange={(ev) => onChange({ ...value, h12: Number(ev.target.value) })}
        value={value.h12}
      >
        {HOURS_12.map((h) => (
          <option key={h} value={h}>
            {String(h).padStart(2, '0')}
          </option>
        ))}
      </select>
      <select
        aria-label={`${idPrefix} minute`}
        className={sel}
        disabled={disabled}
        id={`${idPrefix}-m`}
        onChange={(ev) => onChange({ ...value, mm: ev.target.value })}
        value={value.mm}
      >
        {MINUTES_OPTS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <select
        aria-label={`${idPrefix} AM or PM`}
        className={`${sel} min-w-[68px]`}
        disabled={disabled}
        id={`${idPrefix}-p`}
        onChange={(ev) => onChange({ ...value, mer: ev.target.value as 'AM' | 'PM' })}
        value={value.mer}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
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
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [weeklyUi, setWeeklyUi] = useState<WeeklyDayUi[]>(() => scheduleToWeeklyUi(getDoctorScheduleSettings()))
  const initialWeeklyJsonRef = useRef<string | null>(null)
  const [defaultSlotMinutes] = useState<number>(DEFAULT_DOCTOR_SCHEDULE.defaultSlotMinutes)

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
    const schedule = getDoctorScheduleSettings()
    const w = scheduleToWeeklyUi(schedule)
    setWeeklyUi(w)
    initialWeeklyJsonRef.current = JSON.stringify(weeklyUiToPayload(w))
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
      syncDoctorScheduleFromServer(me)
      const applied = getDoctorScheduleSettings()
      setOpdStart(applied.opdStart)
      setOpdEnd(applied.opdEnd)
      setAddEveningShift(applied.addEveningShift)
      setEveningStart(applied.eveningStart)
      setEveningEnd(applied.eveningEnd)
      setDefaultSlotMinutes(applied.defaultSlotMinutes)
      const schedule = getDoctorScheduleSettings()
      const w = scheduleToWeeklyUi(schedule)
      setWeeklyUi(w)
      initialWeeklyJsonRef.current = JSON.stringify(weeklyUiToPayload(w))
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
    const payloadSchedule = weeklyUiToPayload(weeklyUi)
    const scheduleSnap = JSON.stringify(payloadSchedule)
    const stored = getDoctorScheduleSettings()
    saveDoctorScheduleSettings({
      ...stored,
      weeklySchedule: weeklyUiToStoredRows(weeklyUi),
      defaultSlotMinutes,
    }
    saveDoctorScheduleSettings(schedulePayload)
    try {
      localStorage.setItem(DAY_AVAILABILITY_LOCAL_KEY, JSON.stringify(dayAvailability))
    } catch {
      /* ignore */
    }
    if (!fullName.trim()) {
      setBanner({ type: 'err', text: 'Full name is required.' })
      return
    }
    const scheduleChanged = initialWeeklyJsonRef.current !== scheduleSnap
    if (!hasAuthToken()) {
      setBanner({
        type: 'ok',
        text: 'Saved on this device. Sign in to sync your profile and OPD hours to the server.',
      })
      initialWeeklyJsonRef.current = scheduleSnap
      setBanner({ type: 'ok', text: 'Availability saved on this device. Sign in to sync your profile and server.' })
      return
    }
    const profileChanged =
      !initialProfile ||
      fullName.trim() !== initialProfile.fullName.trim() ||
      jobTitle.trim() !== initialProfile.jobTitle.trim() ||
      phone.trim() !== initialProfile.phone.trim() ||
      license.trim() !== initialProfile.license.trim() ||
      avatarUrl.trim() !== initialProfile.avatarUrl.trim()
    if (!profileChanged && !scheduleChanged) {
      setBanner({ type: 'ok', text: 'No changes to save.' })
      return
    }
    setSaving(true)
    try {
      const patch: {
        full_name: string
        phone: string
        job_title: string
        medical_license_number: string
        avatar_url: string
        opd_weekly_schedule?: OpdWeeklyDayPayload[]
      } = {
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        job_title: jobTitle.trim() || undefined,
        medical_license_number: license.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined,
        opd_morning_start: opdStart,
        opd_morning_end: opdEnd,
        opd_evening_enabled: addEveningShift,
        opd_evening_start: addEveningShift ? eveningStart : null,
        opd_evening_end: addEveningShift ? eveningEnd : null,
      })
        phone: phone.trim(),
        job_title: jobTitle.trim(),
        medical_license_number: license.trim(),
        avatar_url: avatarUrl.trim(),
      }
      if (scheduleChanged) {
        patch.opd_weekly_schedule = payloadSchedule
      }
      const updated = await patchMyProfile(patch)
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
      initialWeeklyJsonRef.current = scheduleSnap
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl)
      setPreviewBlobUrl(null)
      setBanner({ type: 'ok', text: 'Profile and availability saved.' })
      navigate('/settings')
    } catch (err) {
      setBanner({
        type: 'err',
        text: `Local OPD settings were saved, but the server update failed (${getApiErrorMessage(err)}).`,
        text: `Availability is saved on this device. Profile could not be updated (${getApiErrorMessage(err)}).`,
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
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-[#171d16]">Availability Settings</p>
                    <p className="mt-1 text-xs text-[#3e4a3d]">
                      Defaults match the hours you chose when your profile was created until you save changes here. Appointment slots follow these
                      timings once saved.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {DAY_OPTIONS.map((d) => {
                      const row = weeklyUi.find((x) => x.key === d.key)
                      if (!row) return null
                      const dk = d.key as OpdDayKey
                      return (
                        <div key={d.key} className="rounded-lg border border-gray-200 bg-white p-4">
                          <div className="flex flex-col gap-3 border-b border-gray-100 pb-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">{d.label}</p>
                            <label className="flex cursor-pointer items-center gap-2">
                              <input
                                checked={row.closed}
                                className="h-4 w-4 rounded border-gray-300 text-[#16a34a]"
                                onChange={(ev) => {
                                  const closed = ev.target.checked
                                  setWeeklyUi((prev) =>
                                    prev.map((x) =>
                                      x.key === dk
                                        ? {
                                            ...x,
                                            closed,
                                            eveningEnabled: closed ? false : x.eveningEnabled,
                                          }
                                        : x,
                                    ),
                                  )
                                }}
                                type="checkbox"
                              />
                              <span className={row.closed ? 'text-sm font-semibold text-[#ba1a1a]' : 'text-sm font-semibold text-[#171d16]'}>
                                Closed
                              </span>
                            </label>
                          </div>

                          <p className="mt-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-700">Morning shift</p>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <TimeTripleSelect
                              disabled={row.closed}
                              idPrefix={`${d.key}-morning-start`}
                              onChange={(next) =>
                                setWeeklyUi((prev) => prev.map((x) => (x.key === dk ? { ...x, morningStart: next } : x)))
                              }
                              value={row.morningStart}
                            />
                            <span className="text-sm text-gray-500">to</span>
                            <TimeTripleSelect
                              disabled={row.closed}
                              idPrefix={`${d.key}-morning-end`}
                              onChange={(next) =>
                                setWeeklyUi((prev) => prev.map((x) => (x.key === dk ? { ...x, morningEnd: next } : x)))
                              }
                              value={row.morningEnd}
                            />
                          </div>

                          <label className="mt-4 flex items-center gap-2">
                            <input
                              checked={row.eveningEnabled}
                              className="h-4 w-4 rounded border-gray-300 text-[#16a34a]"
                              disabled={row.closed}
                              onChange={(ev) =>
                                setWeeklyUi((prev) =>
                                  prev.map((x) => (x.key === dk ? { ...x, eveningEnabled: ev.target.checked } : x)),
                                )
                              }
                              type="checkbox"
                            />
                            <span className={`text-sm font-medium ${row.closed ? 'text-gray-400' : 'text-[#171d16]'}`}>
                              Evening shift available
                            </span>
                          </label>

                          {row.eveningEnabled && !row.closed ? (
                            <div className="mt-3">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-700">Evening shift</p>
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                <TimeTripleSelect
                                  idPrefix={`${d.key}-evening-start`}
                                  onChange={(next) =>
                                    setWeeklyUi((prev) => prev.map((x) => (x.key === dk ? { ...x, eveningStart: next } : x)))
                                  }
                                  value={row.eveningStart}
                                />
                                <span className="text-sm text-gray-500">to</span>
                                <TimeTripleSelect
                                  idPrefix={`${d.key}-evening-end`}
                                  onChange={(next) =>
                                    setWeeklyUi((prev) => prev.map((x) => (x.key === dk ? { ...x, eveningEnd: next } : x)))
                                  }
                                  value={row.eveningEnd}
                                />
                              </div>
                            </div>
                          ) : null}
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
