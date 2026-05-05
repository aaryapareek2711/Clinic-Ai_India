import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { getAppointmentDurationMap, setAppointmentDuration as persistAppointmentDuration } from '../lib/appointmentDurations'
import { getApiErrorMessage } from '../lib/apiClient'
import { getDoctorScheduleSettings } from '../lib/doctorScheduleSettings'
import { useProviderIdentity } from '../hooks/useProviderIdentity'
import { createVisitFromPatient, fetchPatients, type PatientSummary } from '../services/patientsApi'
import { DEFAULT_PROVIDER_ID, fetchProviderUpcoming, type ProviderUpcomingAppointment } from '../services/visitWorkflowApi'
import NotificationsDrawer from './NotificationsDrawer'

const DAILY_SLOT_LIMIT = 15
const DURATION_CHOICES = [10, 15, 20, 30, 45, 60] as const

/** `YYYY-MM-DD` in local timezone for `<input type="date" min="…">`. */
function localDateInputMin(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function initials(full: string): string {
  const p = full.trim().split(/\s+/).filter(Boolean)
  if (!p.length) return '?'
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return `${p[0][0] ?? ''}${p[1][0] ?? ''}`.toUpperCase()
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

function addMinutesToIsoLocal(isoLocal: string, mins: number): string {
  const d = new Date(isoLocal)
  if (Number.isNaN(d.getTime())) return isoLocal
  d.setMinutes(d.getMinutes() + mins)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${hh}:${mm}:00`
}

function fmtTimeRange(startIso: string, endIso: string): string {
  const s = new Date(startIso)
  const e = new Date(endIso)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return ''
  return `${s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

type SlotBlock = {
  startIso: string
  endIso: string
  booked: boolean
}

function formatMonthLabel(d: Date): string {
  return d.toLocaleDateString([], { month: 'long', year: 'numeric' })
}

function formatChipTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function computeSlotsForDate(params: {
  dateStr: string
  appointmentDuration: number
  schedule: ReturnType<typeof getDoctorScheduleSettings>
  upcoming: ProviderUpcomingAppointment[]
  durationMap: Record<string, number>
}): SlotBlock[] {
  const { dateStr, appointmentDuration, schedule, upcoming, durationMap } = params
  if (!dateStr) return []
  const selectedDateBooked = upcoming.filter((a) => dateKeyLocal(a.scheduled_start) === dateStr)
  const windows: Array<{ startMin: number; endMin: number }> = []
  const opdStartMin = minutesFromHHmm(schedule.opdStart)
  const opdEndMin = minutesFromHHmm(schedule.opdEnd)
  if (opdEndMin > opdStartMin) windows.push({ startMin: opdStartMin, endMin: opdEndMin })
  if (schedule.addEveningShift) {
    const evStart = minutesFromHHmm(schedule.eveningStart)
    const evEnd = minutesFromHHmm(schedule.eveningEnd)
    if (evEnd > evStart) windows.push({ startMin: evStart, endMin: evEnd })
  }

  const bookedIntervals = selectedDateBooked
    .map((a) => {
      const startIso = a.scheduled_start
      const d = new Date(startIso)
      if (Number.isNaN(d.getTime())) return null
      const startMin = d.getHours() * 60 + d.getMinutes()
      const duration = durationMap[startIso] ?? schedule.defaultSlotMinutes ?? 15
      const endMin = startMin + duration
      return { startMin, endMin, startIso, endIso: addMinutesToIsoLocal(startIso, duration) }
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => a.startMin - b.startMin)

  const blocks: SlotBlock[] = []
  for (const w of windows) {
    let pointer = w.startMin
    while (pointer + appointmentDuration <= w.endMin) {
      const overlap = bookedIntervals.find((iv) => pointer < iv.endMin && pointer + appointmentDuration > iv.startMin)
      if (overlap) {
        if (!blocks.some((b) => b.startIso === overlap.startIso)) {
          blocks.push({ startIso: overlap.startIso, endIso: overlap.endIso, booked: true })
        }
        pointer = Math.max(pointer + (schedule.defaultSlotMinutes || 15), overlap.endMin)
        continue
      }
      const startIso = `${dateStr}T${hhmmFromMinutes(pointer)}:00`
      const endIso = addMinutesToIsoLocal(startIso, appointmentDuration)
      blocks.push({ startIso, endIso, booked: false })
      pointer += schedule.defaultSlotMinutes || 15
    }
  }
  return blocks
    .sort((a, b) => new Date(a.startIso).getTime() - new Date(b.startIso).getTime())
    .filter((slot, idx, arr) => arr.findIndex((x) => x.startIso === slot.startIso) === idx)
}

function NewAppointmentPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const provider = useProviderIdentity()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  const [patients, setPatients] = useState<PatientSummary[]>([])
  const [upcoming, setUpcoming] = useState<ProviderUpcomingAppointment[]>([])
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [appointmentDate, setAppointmentDate] = useState('')
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })
  const schedule = useMemo(() => getDoctorScheduleSettings(), [])
  const [appointmentDuration, setAppointmentDuration] = useState<number>(schedule.defaultSlotMinutes || 15)
  const [selectedStartIso, setSelectedStartIso] = useState<string>('')
  const [manualSelectedMinutes, setManualSelectedMinutes] = useState<number>(0)
  const minAppointmentDate = localDateInputMin()
  const [listLoading, setListLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestedPatientId = (searchParams.get('patientId') || '').trim()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        if (!cancelled) {
          setListLoading(true)
          setError(null)
        }
        const [patientsData, upcomingData] = await Promise.all([
          fetchPatients(),
          fetchProviderUpcoming(DEFAULT_PROVIDER_ID),
        ])
        if (!cancelled) {
          setPatients(patientsData)
          setUpcoming(upcomingData)
          if (requestedPatientId && patientsData.some((p) => p.id === requestedPatientId)) {
            setSelectedId(requestedPatientId)
          }
        }
      } catch (e) {
        if (!cancelled) setError(getApiErrorMessage(e))
      } finally {
        if (!cancelled) setListLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [requestedPatientId])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return patients
    return patients.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        (p.phone_number ?? '').includes(q) ||
        p.id.toLowerCase().includes(q),
    )
  }, [patients, query])

  const selectedDateBooked = useMemo(() => {
    const key = appointmentDate.trim()
    if (!key) return []
    return upcoming.filter((a) => dateKeyLocal(a.scheduled_start) === key)
  }, [appointmentDate, upcoming])

  const dayAtCapacity = appointmentDate.trim().length > 0 && selectedDateBooked.length >= DAILY_SLOT_LIMIT
  const durationMap = useMemo(() => getAppointmentDurationMap(), [])
  const slotBlocks = useMemo<SlotBlock[]>(
    () =>
      computeSlotsForDate({
        dateStr: appointmentDate.trim(),
        appointmentDuration,
        schedule,
        upcoming,
        durationMap,
      }),
    [appointmentDate, appointmentDuration, schedule, upcoming, durationMap],
  )

  const monthCells = useMemo(() => {
    const year = visibleMonth.getFullYear()
    const month = visibleMonth.getMonth()
    const firstWeekday = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: Array<{
      key: string
      day: number | null
      dateStr: string | null
      disabled: boolean
      selected: boolean
      hasAvailable: boolean
    }> = []
    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push({ key: `empty-${i}`, day: null, dateStr: null, disabled: true, selected: false, hasAvailable: false })
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const hasAvailable =
        computeSlotsForDate({
          dateStr,
          appointmentDuration,
          schedule,
          upcoming,
          durationMap,
        }).filter((slot) => !slot.booked).length > 0
      cells.push({
        key: dateStr,
        day,
        dateStr,
        disabled: dateStr < minAppointmentDate || !hasAvailable,
        selected: appointmentDate === dateStr,
        hasAvailable,
      })
    }
    return cells
  }, [visibleMonth, appointmentDate, minAppointmentDate, appointmentDuration, schedule, upcoming, durationMap])

  const selectedSlot = slotBlocks.find((b) => b.startIso === selectedStartIso && !b.booked) ?? null
  const selectedDurationForBooking =
    manualSelectedMinutes >= 5 ? manualSelectedMinutes : appointmentDuration

  const displaySlots = useMemo(() => {
    if (!selectedSlot || !appointmentDate.trim() || selectedDurationForBooking === appointmentDuration) return slotBlocks
    const dateStr = appointmentDate.trim()
    const selectedStartMin = minutesFromHHmm(selectedSlot.startIso.slice(11, 16))
    const nextBookedAfter = slotBlocks
      .filter((s) => s.booked)
      .map((s) => minutesFromHHmm(s.startIso.slice(11, 16)))
      .filter((m) => m > selectedStartMin)
      .sort((a, b) => a - b)[0]
    const boundary = typeof nextBookedAfter === 'number' ? nextBookedAfter : 24 * 60
    const step = schedule.defaultSlotMinutes || 15
    const generated: SlotBlock[] = []
    let pointer = selectedStartMin + selectedDurationForBooking
    while (pointer < boundary) {
      const startIso = `${dateStr}T${hhmmFromMinutes(pointer)}:00`
      generated.push({
        startIso,
        endIso: addMinutesToIsoLocal(startIso, appointmentDuration),
        booked: false,
      })
      pointer += step
    }
    const before = slotBlocks.filter((s) => minutesFromHHmm(s.startIso.slice(11, 16)) <= selectedStartMin)
    const after = slotBlocks.filter((s) => minutesFromHHmm(s.startIso.slice(11, 16)) >= boundary)
    return [...before, ...generated, ...after]
  }, [selectedSlot, appointmentDate, selectedDurationForBooking, appointmentDuration, slotBlocks, schedule])
  const availableSlots = useMemo(() => displaySlots.filter((s) => !s.booked), [displaySlots])

  useEffect(() => {
    if (!selectedStartIso) return
    const stillAvailable = slotBlocks.some((b) => !b.booked && b.startIso === selectedStartIso)
    if (!stillAvailable) setSelectedStartIso('')
  }, [selectedStartIso, slotBlocks])

  async function handleConfirm(): Promise<void> {
    setError(null)
    if (!selectedId) {
      setError('Select a patient.')
      return
    }
    if (!appointmentDate.trim()) {
      setError('Choose an appointment date.')
      return
    }
    const dateStr = appointmentDate.trim()
    if (dateStr < minAppointmentDate) {
      setError('Appointment date cannot be in the past.')
      return
    }
    if (!selectedSlot) {
      setError('Select an available appointment slot.')
      return
    }
    const scheduled_start = selectedSlot.startIso
    const when = new Date(scheduled_start)
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() - 60_000) {
      setError('Choose a future date and time (appointments cannot be booked in the past).')
      return
    }
    if (dayAtCapacity) {
      setError(`This date already has ${DAILY_SLOT_LIMIT} appointments. Please choose another date.`)
      return
    }
    try {
      setSubmitting(true)
      const res = await createVisitFromPatient(selectedId, {
        provider_id: DEFAULT_PROVIDER_ID,
        scheduled_start,
      })
      persistAppointmentDuration(scheduled_start, selectedDurationForBooking)
      navigate(`/visits/detail?visitId=${encodeURIComponent(res.visit_id)}&tab=pre-visit`)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="h-screen overflow-hidden antialiased text-[#171d16]">
      <header className="fixed top-0 right-0 z-40 flex h-16 w-[calc(100%-240px)] items-center justify-between border-b border-gray-200 bg-white px-8">
        <div className="flex items-center gap-4">
          <button className="rounded-full p-2 text-gray-500 transition-all hover:bg-gray-50" onClick={() => navigate('/calendar')} type="button">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-[28px] leading-[1.2] font-bold tracking-[-0.02em]">New Visit</h2>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex gap-4">
            <button
              className="relative rounded-full p-2 text-gray-500 transition-opacity hover:bg-gray-50"
              onClick={() => setIsNotificationsOpen(true)}
              type="button"
            >
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#ba1a1a]" />
            </button>
          </div>
          <div className="h-8 w-px bg-gray-200" />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-[#171d16]">{provider.displayName}</p>
              <p className="text-[11px] font-medium text-[#3e4a3d]">{provider.title}</p>
            </div>
            <img
              alt="Dr. Profile"
              className="h-10 w-10 rounded-full border border-gray-200 object-cover"
              src={provider.avatarUrl}
            />
          </div>
        </div>
      </header>

      <main className="flex h-screen pt-16 overflow-hidden">
        <section className="flex w-1/2 flex-col overflow-hidden border-r border-gray-200 bg-white p-8">
          <div className="mb-6">
            <h3 className="mb-2 text-[18px] leading-[1.4] font-semibold text-[#171d16]">Select Existing Patient</h3>
            <p className="text-[#3e4a3d]">Showing registered patients</p>
          </div>
          <div className="mb-6 flex items-center gap-3">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute top-1/2 left-4 -translate-y-1/2 text-gray-400">search</span>
              <input
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pr-4 pl-12 transition-all outline-none focus:border-transparent focus:ring-2 focus:ring-[#2563eb]"
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or mobile number"
                type="search"
                value={query}
              />
            </div>
          </div>
          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
          )}
          <div className="flex-1 space-y-4 overflow-y-auto pr-2">
            {listLoading && <p className="text-sm text-gray-500">Loading patients…</p>}
            {!listLoading && filtered.length === 0 && <p className="text-sm text-gray-500">No patients matched.</p>}
            {filtered.map((p) => {
              const isSel = p.id === selectedId
              const ini = initials(p.full_name || p.first_name)
              return (
                <button
                  key={p.id}
                  className={`flex w-full cursor-pointer items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                    isSel ? 'border-[#2563eb] bg-[#2563eb]/5' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedId(p.id)}
                  type="button"
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ${
                      isSel ? 'bg-[#2563eb] text-white' : 'bg-[#dde5d9] text-[#3e4a3d]'
                    }`}
                  >
                    {ini}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="truncate font-semibold">{p.full_name}</h4>
                      {isSel ? (
                        <span className="shrink-0 rounded-full bg-[#2563eb] px-2 py-0.5 text-[11px] font-bold tracking-wider text-white uppercase">Selected</span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-xs font-medium text-[#3e4a3d]">ID: …{p.id.slice(-10)}</p>
                    <p className="mt-0.5 truncate text-xs text-[#3e4a3d]">{p.phone_number || '—'}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section className="w-1/2 overflow-y-auto bg-[#eff6ea]/40 p-8">
          <div className="mx-auto max-w-xl space-y-8">
            <div>
              <h3 className="mb-6 text-[18px] leading-[1.4] font-semibold text-[#171d16]">Visit Booking</h3>
              <div className="space-y-6">
                <div>
                  <label className="mb-3 block text-[13px] tracking-[0.05em] text-[#3e4a3d] uppercase">Duration</label>
                  <div className="flex flex-wrap gap-2">
                    {DURATION_CHOICES.map((mins) => (
                      <button
                        key={mins}
                        className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
                          appointmentDuration === mins ? 'border-[#2563eb] bg-[#2563eb] text-white' : 'border-gray-200 bg-white text-[#171d16]'
                        }`}
                        onClick={() => setAppointmentDuration(mins)}
                        type="button"
                      >
                        {mins} min
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-[#575e70]">
                    OPD window: {schedule.opdStart} - {schedule.opdEnd}
                    {schedule.addEveningShift ? `, Evening: ${schedule.eveningStart} - ${schedule.eveningEnd}` : ''}
                  </p>
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
                                  : cell.hasAvailable
                                    ? 'text-[#171d16] hover:bg-[#eef2ff]'
                                    : 'text-gray-300'
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
                    {displaySlots.map((slot) => {
                      const active = selectedStartIso === slot.startIso && !slot.booked
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
                            setSelectedStartIso(slot.startIso)
                          }}
                          type="button"
                        >
                          {formatChipTime(slot.startIso)}
                        </button>
                      )
                    })}
                  </div>
                  {!appointmentDate.trim() && <p className="mt-2 text-xs text-[#575e70]">Choose date first to load slots.</p>}
                  {appointmentDate.trim() && availableSlots.length === 0 && (
                    <p className="mt-2 text-xs font-semibold text-red-700">No slots available in OPD hours for selected duration.</p>
                  )}
                  <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
                    <label className="mb-2 block text-sm font-semibold text-[#171d16]">Manual minutes for selected slot</label>
                    {selectedSlot ? (
                      <div className="flex items-center gap-3">
                        <input
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          min={0}
                          onChange={(e) => setManualSelectedMinutes(Math.max(0, Number(e.target.value) || 0))}
                          type="number"
                          value={manualSelectedMinutes || ''}
                        />
                        <span className="text-xs text-[#575e70]">
                          Example: select `3:00 PM` and enter `20` then next slots shift to `3:20, 3:35, 3:50...` until next booked slot.
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-[#575e70]">Select a slot first, then set manual minutes.</p>
                    )}
                  </div>
                  {appointmentDate.trim().length > 0 && (
                    <p className="mt-2 text-xs text-[#575e70]">
                      Slots used: {selectedDateBooked.length}/{DAILY_SLOT_LIMIT}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-[#575e70]">
                    Visit will be created for{' '}
                    {patients.find((p) => p.id === selectedId)?.full_name ?? '(choose patient)'}.
                  </p>
                  {selectedSlot && (
                    <p className="mt-1 text-xs font-semibold text-[#0f5132]">
                      Selected: {fmtTimeRange(selectedSlot.startIso, addMinutesToIsoLocal(selectedSlot.startIso, selectedDurationForBooking))}
                    </p>
                  )}
                  {dayAtCapacity && (
                    <p className="mt-1 text-xs font-semibold text-red-700">
                      Daily limit reached ({DAILY_SLOT_LIMIT} appointments). Please pick another date.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
              <button
                className="flex items-center gap-2 px-6 py-3 font-semibold text-[#3e4a3d] transition-colors hover:text-[#171d16]"
                onClick={() => navigate('/calendar')}
                type="button"
              >
                Cancel
              </button>
              <button
                className="flex items-center gap-2 rounded-xl bg-[#16a34a] px-8 py-3 font-bold text-white shadow-sm transition-all hover:bg-[#00873a] disabled:opacity-50"
                disabled={submitting || dayAtCapacity || !selectedSlot}
                onClick={() => void handleConfirm()}
                type="button"
              >
                {submitting ? 'Saving…' : 'Confirm Visit'}
                <span className="material-symbols-outlined">check_circle</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}

export default NewAppointmentPage
