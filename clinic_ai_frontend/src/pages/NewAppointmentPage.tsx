import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getApiErrorMessage } from '../lib/apiClient'
import { useProviderIdentity } from '../hooks/useProviderIdentity'
import { createVisitFromPatient, fetchPatients, type PatientSummary } from '../services/patientsApi'
import { DEFAULT_PROVIDER_ID, fetchProviderUpcoming, type ProviderUpcomingAppointment } from '../services/visitWorkflowApi'
import NotificationsDrawer from './NotificationsDrawer'

const HOURS_12 = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'] as const
const MINUTES_STEP_15 = ['00', '15', '30', '45'] as const
const DAILY_SLOT_LIMIT = 15

/** `YYYY-MM-DD` in local timezone for `<input type="date" min="…">`. */
function localDateInputMin(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function to24Hour(hour12: string, minute: string, period: 'AM' | 'PM'): string {
  let h = parseInt(hour12, 10)
  if (Number.isNaN(h)) h = 10
  if (period === 'PM' && h !== 12) h += 12
  if (period === 'AM' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${minute}`
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

function NewAppointmentPage() {
  const navigate = useNavigate()
  const provider = useProviderIdentity()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [appointmentHour, setAppointmentHour] = useState<string>('10')
  const [appointmentMinute, setAppointmentMinute] = useState<string>('00')
  const [appointmentPeriod, setAppointmentPeriod] = useState<'AM' | 'PM'>('AM')

  const [patients, setPatients] = useState<PatientSummary[]>([])
  const [upcoming, setUpcoming] = useState<ProviderUpcomingAppointment[]>([])
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [appointmentDate, setAppointmentDate] = useState('')
  const minAppointmentDate = localDateInputMin()
  const [listLoading, setListLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
  }, [])

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
  const selectedTime24 = to24Hour(appointmentHour, appointmentMinute, appointmentPeriod)
  const selectedSlotBooked = selectedDateBooked.some((a) => {
    const d = new Date(a.scheduled_start)
    if (Number.isNaN(d.getTime())) return false
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}` === selectedTime24
  })

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
    const t = to24Hour(appointmentHour, appointmentMinute, appointmentPeriod)
    const scheduled_start = `${dateStr}T${t}:00`
    const when = new Date(`${dateStr}T${t}:00`)
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() - 60_000) {
      setError('Choose a future date and time (appointments cannot be booked in the past).')
      return
    }
    if (dayAtCapacity) {
      setError(`This date already has ${DAILY_SLOT_LIMIT} appointments. Please choose another date.`)
      return
    }
    if (selectedSlotBooked) {
      setError('This slot is already booked. Please choose another time.')
      return
    }
    try {
      setSubmitting(true)
      const res = await createVisitFromPatient(selectedId, {
        provider_id: DEFAULT_PROVIDER_ID,
        scheduled_start,
      })
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
                  <label className="mb-3 block text-[13px] tracking-[0.05em] text-[#3e4a3d] uppercase" htmlFor="na-date">
                    Visit date
                  </label>
                  <input
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-[#2563eb]"
                    id="na-date"
                    min={minAppointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    type="date"
                    value={appointmentDate}
                  />
                  {appointmentDate.trim().length > 0 && (
                    <p className="mt-2 text-xs text-[#575e70]">
                      Slots used: {selectedDateBooked.length}/{DAILY_SLOT_LIMIT}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-3 block text-[13px] tracking-[0.05em] text-[#3e4a3d] uppercase">Select Time</label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="relative">
                      <select
                        aria-label="Hour"
                        className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
                        onChange={(e) => setAppointmentHour(e.target.value)}
                        value={appointmentHour}
                      >
                        {HOURS_12.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-400">
                        <span className="material-symbols-outlined text-lg">expand_more</span>
                      </span>
                    </div>
                    <div className="relative">
                      <select
                        aria-label="Minute"
                        className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
                        onChange={(e) => setAppointmentMinute(e.target.value)}
                        value={appointmentMinute}
                      >
                        {MINUTES_STEP_15.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-400">
                        <span className="material-symbols-outlined text-lg">expand_more</span>
                      </span>
                    </div>
                    <div className="relative">
                      <select
                        aria-label="AM or PM"
                        className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
                        onChange={(e) => setAppointmentPeriod(e.target.value as 'AM' | 'PM')}
                        value={appointmentPeriod}
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-400">
                        <span className="material-symbols-outlined text-lg">expand_more</span>
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-[#575e70]">
                    Visit will be created for{' '}
                    {patients.find((p) => p.id === selectedId)?.full_name ?? '(choose patient)'}.
                  </p>
                  {selectedSlotBooked && (
                    <p className="mt-2 text-xs font-semibold text-red-700">Selected slot is already booked (frozen).</p>
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
                disabled={submitting || dayAtCapacity || selectedSlotBooked}
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
