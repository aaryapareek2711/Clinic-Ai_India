import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  getAppointmentDurationMap,
  setAppointmentDuration as persistAppointmentDuration,
} from '../lib/appointmentDurations'
import { getApiErrorMessage } from '../lib/apiClient'
import { getDoctorScheduleSettings } from '../lib/doctorScheduleSettings'
import { useProviderIdentity } from '../hooks/useProviderIdentity'
import { createVisitFromPatient, registerPatient } from '../services/patientsApi'
import { DEFAULT_PROVIDER_ID, fetchProviderUpcoming, type ProviderUpcomingAppointment } from '../services/visitWorkflowApi'
import NotificationsDrawer from './NotificationsDrawer'

function localDateInputMin(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Accept any common India input; return `91` + 10 digits (first digit 6–9) or null if unusable. */
function normalizeIndiaMobileForApi(raw: string): string | null {
  let d = raw.replace(/\D/g, '')
  if (!d) return null
  if (d.startsWith('00')) d = d.slice(2)
  if (d.length === 12 && d.startsWith('91') && /^91[6-9]\d{9}$/.test(d)) return d
  if (d.length === 10 && /^[6-9]\d{9}$/.test(d)) return `91${d}`
  if (d.length === 11 && d.startsWith('0') && /^0[6-9]\d{9}$/.test(d)) return `91${d.slice(1)}`
  if (d.length > 12) {
    const last12 = d.slice(-12)
    if (last12.startsWith('91') && /^91[6-9]\d{9}$/.test(last12)) return last12
  }
  if (d.length >= 10) {
    const last10 = d.slice(-10)
    if (/^[6-9]\d{9}$/.test(last10)) return `91${last10}`
  }
  return null
}

function dateKeyLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function minutesFromHHmm(v: string): number {
  const [h, m] = v.split(':').map((n) => Number(n))
  if (Number.isNaN(h) || Number.isNaN(m)) return 0
  return h * 60 + m
}

function hhmmFromMinutes(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function localSlotTimestamp(dateStr: string, hhmm: string): number {
  const [yearStr, monthStr, dayStr] = dateStr.split('-')
  const [hourStr, minuteStr] = hhmm.split(':')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)
  const hour = Number(hourStr)
  const minute = Number(minuteStr)
  if (
    [year, month, day, hour, minute].some(Number.isNaN) ||
    year < 1970 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return Number.NaN
  }
  return new Date(year, month - 1, day, hour, minute, 0, 0).getTime()
}

function localSlotKeyFromIso(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${hh}:${mm}`
}

function formatMonthLabel(d: Date): string {
  return d.toLocaleDateString([], { month: 'long', year: 'numeric' })
}

function formatChipTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function safeVisitId(value: unknown): string | null {
  const s = String(value ?? '').trim()
  if (!s || s === 'undefined' || s === 'null') return null
  return s
}

type SlotBlock = {
  startIso: string
  booked: boolean
}

function NewVisitPage() {
  const navigate = useNavigate()
  const provider = useProviderIdentity()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [mobile, setMobile] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [language, setLanguage] = useState('en')
  const [consent, setConsent] = useState(false)
  const [appointmentDate, setAppointmentDate] = useState('')
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })
  const [selectedStartIsos, setSelectedStartIsos] = useState<string[]>([])
  const [visitKind, setVisitKind] = useState<'scheduled' | 'walk_in'>('scheduled')
  const [upcoming, setUpcoming] = useState<ProviderUpcomingAppointment[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const schedule = useMemo(() => getDoctorScheduleSettings(), [])
  const durationMap = useMemo(() => getAppointmentDurationMap(), [])
  const minDate = localDateInputMin()

  useEffect(() => {
    const dateStr = appointmentDate.trim()
    if (!dateStr) {
      setUpcoming([])
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const data = await fetchProviderUpcoming(DEFAULT_PROVIDER_ID, {
          fromDate: `${dateStr}T00:00:00`,
          toDate: `${dateStr}T23:59:59`,
        })
        if (!cancelled) setUpcoming(data)
      } catch {
        if (!cancelled) setUpcoming([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [appointmentDate])

  const slotBlocks = useMemo<SlotBlock[]>(() => {
    const dateStr = appointmentDate.trim()
    if (!dateStr) return []
    const step = schedule.defaultSlotMinutes || 15
    const windows: Array<{ startMin: number; endMin: number }> = []
    const opdStartMin = minutesFromHHmm(schedule.opdStart)
    const opdEndMin = minutesFromHHmm(schedule.opdEnd)
    if (opdEndMin > opdStartMin) windows.push({ startMin: opdStartMin, endMin: opdEndMin })
    if (schedule.addEveningShift) {
      const evStart = minutesFromHHmm(schedule.eveningStart)
      const evEnd = minutesFromHHmm(schedule.eveningEnd)
      if (evEnd > evStart) windows.push({ startMin: evStart, endMin: evEnd })
    }
    const selectedDateBooked = upcoming.filter((a) => dateKeyLocal(a.scheduled_start) === dateStr)
    const bookedIntervals = selectedDateBooked
      .map((a) => {
        const bookedKey = localSlotKeyFromIso(a.scheduled_start)
        if (!bookedKey) return null
        const [bookedDate, bookedHm] = bookedKey.split('T')
        if (!bookedDate || !bookedHm) return null
        const startTime = localSlotTimestamp(bookedDate, bookedHm)
        if (Number.isNaN(startTime)) return null
        const d = new Date(a.scheduled_start)
        if (Number.isNaN(d.getTime())) return null
        const startMin = d.getHours() * 60 + d.getMinutes()
        const startIsoWithSeconds = `${bookedDate}T${bookedHm}:00`
        const duration = durationMap[a.scheduled_start] ?? schedule.defaultSlotMinutes ?? 15
        const endMin = startMin + duration
        return { startMin, endMin, startTime, startIso: startIsoWithSeconds }
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, b) => a.startMin - b.startMin)
    const out: SlotBlock[] = []
    const now = Date.now()
    for (const w of windows) {
      let pointer = w.startMin
      while (pointer + step <= w.endMin) {
        const overlap = bookedIntervals.find((iv) => pointer < iv.endMin && pointer + step > iv.startMin)
        if (overlap) {
          if (overlap.startTime >= now - 60_000) {
            out.push({
              startIso: overlap.startIso,
              booked: true,
            })
          }
          pointer = Math.max(pointer + step, overlap.endMin)
          continue
        }
        const slotHhmm = hhmmFromMinutes(pointer)
        const startIso = `${dateStr}T${slotHhmm}:00`
        const startTime = localSlotTimestamp(dateStr, slotHhmm)
        if (!Number.isNaN(startTime) && startTime >= now - 60_000) out.push({ startIso, booked: false })
        pointer += step
      }
    }
    return out
      .sort((a, b) => new Date(a.startIso).getTime() - new Date(b.startIso).getTime())
      .filter((slot, idx, arr) => arr.findIndex((x) => x.startIso === slot.startIso) === idx)
  }, [appointmentDate, durationMap, schedule, upcoming])

  const selectedSlots = useMemo(
    () =>
      selectedStartIsos
        .map((iso) => slotBlocks.find((s) => !s.booked && s.startIso === iso))
        .filter((s): s is SlotBlock => Boolean(s)),
    [selectedStartIsos, slotBlocks],
  )

  const selectedSlot = selectedSlots[0] ?? null

  useEffect(() => {
    setSelectedStartIsos((prev) => prev.filter((iso) => slotBlocks.some((s) => !s.booked && s.startIso === iso)))
  }, [slotBlocks])

  const monthCells = useMemo(() => {
    const year = visibleMonth.getFullYear()
    const month = visibleMonth.getMonth()
    const firstWeekday = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: Array<{ key: string; day: number | null; dateStr: string | null; disabled: boolean; selected: boolean }> = []
    for (let i = 0; i < firstWeekday; i += 1) cells.push({ key: `empty-${i}`, day: null, dateStr: null, disabled: true, selected: false })
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      cells.push({
        key: dateStr,
        day,
        dateStr,
        disabled: dateStr < minDate,
        selected: appointmentDate === dateStr,
      })
    }
    return cells
  }, [visibleMonth, appointmentDate, minDate])

  async function handleConfirm(): Promise<void> {
    setFormError(null)
    const trimmedName = fullName.trim()
    const normalizedPhone = normalizeIndiaMobileForApi(mobile)
    const ageNum = parseInt(age, 10)
    if (!trimmedName) {
      setFormError('Patient name is required.')
      return
    }
    if (!normalizedPhone) {
      setFormError('Enter a valid Indian mobile number (10 digits, or with +91 / leading 0).')
      return
    }
    if (Number.isNaN(ageNum) || ageNum < 0 || ageNum > 130) {
      setFormError('Enter a valid age.')
      return
    }
    if (!gender) {
      setFormError('Select gender.')
      return
    }
    if (!consent) {
      setFormError('Consent is required to register.')
      return
    }
    const hasAppointmentDate = appointmentDate.trim().length > 0
    if (hasAppointmentDate && visitKind === 'walk_in' && !selectedSlot) {
      setFormError('Select an appointment slot for Walk-in visit type.')
      return
    }
    try {
      setSubmitting(true)
      const registered = await registerPatient({
        name: trimmedName,
        phone_number: normalizedPhone,
        age: ageNum,
        gender,
        preferred_language: language,
        travelled_recently: false,
        consent: true,
        visit_type: visitKind,
      })
      if (hasAppointmentDate) {
        const startsToCreate =
          visitKind === 'walk_in'
            ? selectedSlot
              ? [selectedSlot.startIso]
              : []
            : selectedSlots
                .map((s) => s.startIso)
                .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

        if (visitKind === 'walk_in' && startsToCreate.length === 0) {
          setFormError('Select appointment slot(s).')
          return
        }

        if (startsToCreate.length === 0) {
          setFormError('Select appointment slot(s).')
          return
        }

        const firstStart = startsToCreate[0]
        const totalDuration = startsToCreate.length * (schedule.defaultSlotMinutes || 15)
        const createdVisit = await createVisitFromPatient(registered.patient_id, {
          provider_id: DEFAULT_PROVIDER_ID,
          scheduled_start: firstStart,
          visit_type: visitKind,
        })
        persistAppointmentDuration(firstStart, totalDuration)
        const bookedId = safeVisitId(createdVisit?.visit_id)
        if (!bookedId) {
          navigate('/dashboard', { replace: true })
          return
        }
        navigate('/dashboard', { replace: true })
        return
      }
      // Registration-only mode: patient is created, visit is created later on booking.
      navigate('/dashboard', { replace: true })
    } catch (e) {
      setFormError(getApiErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen font-manrope antialiased text-[#171d16]">
      <header className="fixed top-0 right-0 z-40 flex h-16 w-[calc(100%-240px)] items-center justify-end border-b border-gray-200 bg-white px-8">
        <div className="flex items-center gap-6">
          <button
            className="relative flex items-center text-gray-500 transition-opacity hover:opacity-80"
            onClick={() => setIsNotificationsOpen(true)}
            type="button"
          >
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-[#ba1a1a] ring-2 ring-white" />
          </button>
          <div className="h-8 w-px bg-gray-200" />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">{provider.displayName}</p>
              <p className="text-xs text-gray-500">{provider.title}</p>
            </div>
            <img
              alt="Dr. Profile"
              className="h-10 w-10 rounded-full border border-gray-200 object-cover"
              src={provider.avatarUrl}
            />
          </div>
        </div>
      </header>

      <main className="min-h-screen pt-16">
        <div className="mx-auto max-w-7xl p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <nav className="mb-2 flex items-center gap-2 text-sm text-[#3e4a3d]">
                <span>Visits</span>
                <span className="material-symbols-outlined text-sm">chevron_right</span>
                <span className="font-medium text-[#006b2c]">Register new patient</span>
              </nav>
              <h2 className="text-[28px] leading-[1.2] font-bold tracking-[-0.02em]">Register New Patient</h2>
              <p className="mt-1 text-sm text-[#3e4a3d]">
                Already registered? Use New Visit to search and continue with an existing patient.
              </p>
            </div>
            <div className="flex gap-4">
              <button
                className="flex items-center gap-2 rounded-lg bg-[#16a34a] px-6 py-2 font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                disabled={submitting}
                onClick={() => void handleConfirm()}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">save</span>
                {submitting ? 'Saving…' : 'Confirm Registration'}
              </button>
            </div>
          </div>

          {formError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-7">
              <div className="rounded-xl border border-gray-200 bg-white p-8">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00873a]/10 text-[#006b2c]">
                    <span className="material-symbols-outlined">person_add</span>
                  </div>
                  <h3 className="text-[18px] leading-[1.4] font-semibold">New Patient Registration</h3>
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 space-y-2">
                      <label className="block text-[13px] tracking-[0.05em] text-[#3e4a3d] uppercase" htmlFor="nv-name">
                        Full Name
                      </label>
                      <input
                        className="w-full rounded-lg border border-gray-200 px-4 py-3 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                        id="nv-name"
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Johnathan Smith"
                        type="text"
                        value={fullName}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[13px] tracking-[0.05em] text-[#3e4a3d] uppercase" htmlFor="nv-phone">
                        Mobile Number
                      </label>
                      <input
                        className="w-full rounded-lg border border-gray-200 px-4 py-3 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                        id="nv-phone"
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="98765 43210, +91 …, or 091…"
                        type="tel"
                        value={mobile}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[13px] tracking-[0.05em] text-[#3e4a3d] uppercase" htmlFor="nv-age">
                        Age
                      </label>
                      <input
                        className="w-full rounded-lg border border-gray-200 px-4 py-3 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                        id="nv-age"
                        min={0}
                        max={130}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="24"
                        type="number"
                        value={age}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[13px] tracking-[0.05em] text-[#3e4a3d] uppercase" htmlFor="nv-gender">
                        Gender
                      </label>
                      <select
                        className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                        id="nv-gender"
                        onChange={(e) => setGender(e.target.value)}
                        value={gender}
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[13px] tracking-[0.05em] text-[#3e4a3d] uppercase" htmlFor="nv-lang">
                        Language Preference
                      </label>
                      <select
                        className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                        id="nv-lang"
                        onChange={(e) => setLanguage(e.target.value)}
                        value={language}
                      >
                        <option value="en">English</option>
                        <option value="hi">Hindi</option>
                        <option value="kn">Kannada</option>
                        <option value="ta">Tamil</option>
                        <option value="te">Telugu</option>
                        <option value="mr">Marathi</option>
                      </select>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-start gap-3">
                      <input
                        checked={consent}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-[#006b2c] focus:ring-[#006b2c]"
                        id="consent"
                        onChange={(e) => setConsent(e.target.checked)}
                        type="checkbox"
                      />
                      <label className="text-sm text-gray-500" htmlFor="consent">
                        The patient has consented to digital health records processing and privacy terms as per clinical standards.
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-[#bdcaba] bg-[#e3eadf] p-6">
                <h4 className="mb-4 text-sm font-semibold">Summary Preview</h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#3e4a3d]">Patient</span>
                    <span className="font-medium">{fullName.trim() || '—'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#3e4a3d]">Slot</span>
                    <span className="font-medium">
                      {selectedSlots.length > 0
                        ? visitKind === 'walk_in'
                          ? `${appointmentDate} ${formatChipTime(selectedSlot?.startIso || '')} (${schedule.defaultSlotMinutes || 15}m) · Walk-in`
                          : `${selectedSlots.length} slot(s) selected on ${appointmentDate}`
                        : visitKind === 'walk_in'
                          ? 'Select walk-in time'
                          : 'Open / TBD'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#3e4a3d]">Mobile (saved as)</span>
                    <span className="max-w-[60%] text-right font-mono text-xs font-medium">
                      {normalizeIndiaMobileForApi(mobile) ?? '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 lg:col-span-5">
              <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-8">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00873a]/10 text-[#006b2c]">
                    <span className="material-symbols-outlined">calendar_month</span>
                  </div>
                  <h3 className="text-[18px] leading-[1.4] font-semibold">Appointment Booking</h3>
                </div>
                <div className="flex flex-1 flex-col space-y-6">
                  <div>
                    <label className="mb-2 block text-[13px] tracking-[0.05em] text-[#3e4a3d] uppercase" htmlFor="appointment-visit-type">
                      Visit Type
                    </label>
                    <div className="inline-flex w-full rounded-lg border border-gray-200 bg-white p-1">
                      <button
                        className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                          visitKind === 'scheduled' ? 'bg-[#16a34a] text-white' : 'text-[#171d16] hover:bg-[#f4fcf0]'
                        }`}
                        onClick={() => setVisitKind('scheduled')}
                        type="button"
                      >
                        Scheduled
                      </button>
                      <button
                        className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                          visitKind === 'walk_in' ? 'bg-[#16a34a] text-white' : 'text-[#171d16] hover:bg-[#f4fcf0]'
                        }`}
                        onClick={() => setVisitKind('walk_in')}
                        type="button"
                      >
                        Walk-in
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="mb-3 text-[13px] tracking-[0.05em] text-[#3e4a3d] uppercase">Available Day</p>
                    <div className="rounded-2xl border border-gray-200 bg-white">
                      <div className="flex items-center justify-between rounded-t-2xl bg-[#6366f1] px-4 py-3 text-white">
                        <p className="text-sm font-semibold">{formatMonthLabel(visibleMonth)}</p>
                        <div className="flex items-center gap-2">
                          <button
                            className="rounded-md p-1 hover:bg-white/20"
                            onClick={() => {
                              const d = new Date(visibleMonth)
                              d.setMonth(d.getMonth() - 1)
                              setVisibleMonth(d)
                            }}
                            type="button"
                          >
                            <span className="material-symbols-outlined text-base">chevron_left</span>
                          </button>
                          <button
                            className="rounded-md p-1 hover:bg-white/20"
                            onClick={() => {
                              const d = new Date(visibleMonth)
                              d.setMonth(d.getMonth() + 1)
                              setVisibleMonth(d)
                            }}
                            type="button"
                          >
                            <span className="material-symbols-outlined text-base">chevron_right</span>
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-7 border-b border-gray-100 px-3 py-2 text-center text-xs font-semibold text-gray-500">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                          <div key={d}>{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-y-1 px-3 py-3">
                        {monthCells.map((cell) =>
                          cell.day === null ? (
                            <div key={cell.key} />
                          ) : (
                            <button
                              key={cell.key}
                              className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm ${
                                cell.disabled
                                  ? 'cursor-not-allowed text-gray-300'
                                  : cell.selected
                                    ? 'bg-[#6366f1] text-white'
                                    : 'text-[#171d16] hover:bg-[#eef2ff]'
                              }`}
                              disabled={cell.disabled}
                              onClick={() => {
                                if (!cell.dateStr) return
                                setAppointmentDate(cell.dateStr)
                              }}
                              type="button"
                            >
                              {cell.day}
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-[13px] tracking-[0.05em] text-[#3e4a3d] uppercase">Available Time</p>
                    <div className="flex flex-wrap gap-2">
                      {slotBlocks.map((slot) => {
                        const active = selectedStartIsos.includes(slot.startIso) && !slot.booked
                        return (
                          <button
                            key={slot.startIso}
                            className={`rounded-xl border px-4 py-2 text-sm font-medium ${
                              slot.booked
                                ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 line-through'
                                : active
                                  ? 'border-[#6366f1] bg-[#6366f1] text-white'
                                  : 'border-gray-200 bg-white text-[#171d16] hover:border-[#6366f1]/40'
                            }`}
                            disabled={slot.booked}
                            onClick={() => {
                              if (visitKind === 'walk_in') {
                                setSelectedStartIsos([slot.startIso])
                                return
                              }
                              setSelectedStartIsos((prev) =>
                                prev.includes(slot.startIso)
                                  ? prev.filter((x) => x !== slot.startIso)
                                  : [...prev, slot.startIso],
                              )
                            }}
                            type="button"
                          >
                            {formatChipTime(slot.startIso)}
                          </button>
                        )
                      })}
                    </div>
                    {!appointmentDate && <p className="mt-2 text-xs text-[#575e70]">Choose a day first.</p>}
                    {visitKind === 'walk_in' && !selectedSlot && (
                      <p className="mt-2 text-xs font-semibold text-[#0f5132]">Walk-in also needs an appointment time.</p>
                    )}
                    {visitKind === 'scheduled' && selectedSlots.length > 0 && (
                      <p className="mt-2 text-xs font-semibold text-[#0f5132]">Selected slots: {selectedSlots.length}</p>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}

export default NewVisitPage
