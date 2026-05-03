import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getApiErrorMessage } from '../lib/apiClient'
import { registerPatient } from '../services/patientsApi'
import NotificationsDrawer from './NotificationsDrawer'

const HOURS_12 = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'] as const
const MINUTES_STEP_15 = ['00', '15', '30', '45'] as const

function to24Hour(hour12: string, minute: string, period: 'AM' | 'PM'): string {
  let h = parseInt(hour12, 10)
  if (Number.isNaN(h)) h = 9
  if (period === 'PM' && h !== 12) h += 12
  if (period === 'AM' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${minute}`
}

function NewVisitPage() {
  const navigate = useNavigate()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [visitTimeHour, setVisitTimeHour] = useState<string>('9')
  const [visitTimeMinute, setVisitTimeMinute] = useState<string>('00')
  const [visitTimePeriod, setVisitTimePeriod] = useState<'AM' | 'PM'>('AM')
  const [fullName, setFullName] = useState('')
  const [mobile, setMobile] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [language, setLanguage] = useState('en')
  const [consent, setConsent] = useState(false)
  const [appointmentDate, setAppointmentDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleConfirm(): Promise<void> {
    setFormError(null)
    const trimmedName = fullName.trim()
    const trimmedPhone = mobile.replace(/\s+/g, '')
    const ageNum = parseInt(age, 10)
    if (!trimmedName) {
      setFormError('Patient name is required.')
      return
    }
    if (!trimmedPhone || trimmedPhone.length < 8) {
      setFormError('Enter a valid mobile number.')
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

    const time24 = to24Hour(visitTimeHour, visitTimeMinute, visitTimePeriod)
    const appointment_time = appointmentDate.trim() ? time24 : null
    const appointment_date = appointmentDate.trim() || null

    try {
      setSubmitting(true)
      const res = await registerPatient({
        name: trimmedName,
        phone_number: trimmedPhone,
        age: ageNum,
        gender,
        preferred_language: language,
        travelled_recently: false,
        consent: true,
        appointment_date,
        appointment_time,
        visit_type: 'Visit',
      })
      navigate(`/visits/detail?visitId=${encodeURIComponent(res.visit_id)}&tab=pre-visit`)
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
              <p className="text-sm font-semibold text-gray-900">Dr. Sarah Jenkins</p>
              <p className="text-xs text-gray-500">Cardiologist</p>
            </div>
            <img
              alt="Dr. Profile"
              className="h-10 w-10 rounded-full border border-gray-200 object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAHypBFfim5qvr_z9DI4uV6FNnEepu9krhEl0WrrfDEHXlapJWtLqxcKITFrCHZTNf759V_p4i3Ro-sjERsJb25Vsyx549xjSEHtO1tJUlERpiJtcSAYwp3FE5a8Hwy1J-EIzQCNc-GFbRp4q-uC6nrOidIuRtDPy1NOqQg4vgIOVF5OZhiYt9apl2tTPv31YYstwQV9cgytqBO_F6H7LrshgDCY6bPhKVoUNvL8Xu1dnz-ej2W83moDNyjshAmtEj_WNg7rRhHVts-"
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
                <span className="font-medium text-[#006b2c]">New Visit</span>
              </nav>
              <h2 className="text-[28px] leading-[1.2] font-bold tracking-[-0.02em]">Create New Visit</h2>
            </div>
            <div className="flex gap-4">
              <button
                className="rounded-lg border border-gray-200 bg-white px-6 py-2 font-semibold text-[#111827] transition-colors hover:bg-gray-50"
                onClick={() => navigate('/dashboard')}
                type="button"
              >
                Cancel
              </button>
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
                        placeholder="+91 98765 43210"
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
                  <div className="space-y-2">
                    <label className="block text-[13px] tracking-[0.05em] text-[#3e4a3d] uppercase" htmlFor="nv-appt-date">
                      Visit date (optional — triggers WhatsApp intake when configured)
                    </label>
                    <input
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                      id="nv-appt-date"
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      type="date"
                      value={appointmentDate}
                    />
                    <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#eff6ea] p-3">
                      <span className="material-symbols-outlined text-[20px] text-[#006b2c]">event_available</span>
                      <span className="text-sm font-medium">
                        {appointmentDate ? `Scheduling helper: ${appointmentDate}` : 'Leave date empty for open visit / staff scheduling'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-[13px] tracking-[0.05em] text-[#3e4a3d] uppercase">Time</label>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="relative">
                        <select
                          aria-label="Hour"
                          className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm font-medium focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                          onChange={(e) => setVisitTimeHour(e.target.value)}
                          value={visitTimeHour}
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
                          className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm font-medium focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                          onChange={(e) => setVisitTimeMinute(e.target.value)}
                          value={visitTimeMinute}
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
                          className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm font-medium focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                          onChange={(e) => setVisitTimePeriod(e.target.value as 'AM' | 'PM')}
                          value={visitTimePeriod}
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-400">
                          <span className="material-symbols-outlined text-lg">expand_more</span>
                        </span>
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed text-gray-500">Sent to `/api/patients/register` as `appointment_date` + `appointment_time` (24h).</p>
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
                      {appointmentDate ? `${appointmentDate} ${to24Hour(visitTimeHour, visitTimeMinute, visitTimePeriod)}` : 'Open / TBD'}
                    </span>
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
