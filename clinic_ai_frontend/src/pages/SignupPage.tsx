import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'

import { getApiErrorMessage } from '../lib/apiClient'
import { identityForRegister } from '../lib/registerIdentity'
import { persistAuthSession, registerAccount } from '../services/authApi'

const HOUR_OPTIONS_12H = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

function composeTime12(hour: string, minute: string, period: string): string {
  if (!hour || !minute || !period) return ''
  return `${Number(hour)}:${minute} ${period}`
}

function SignupPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [specialty, setSpecialty] = useState('general')
  const [morningStartHour, setMorningStartHour] = useState('')
  const [morningStartMinute, setMorningStartMinute] = useState('')
  const [morningStartPeriod, setMorningStartPeriod] = useState('')
  const [morningEndHour, setMorningEndHour] = useState('')
  const [morningEndMinute, setMorningEndMinute] = useState('')
  const [morningEndPeriod, setMorningEndPeriod] = useState('')
  const [eveningEnabled, setEveningEnabled] = useState(false)
  const [eveningStartHour, setEveningStartHour] = useState('')
  const [eveningStartMinute, setEveningStartMinute] = useState('')
  const [eveningStartPeriod, setEveningStartPeriod] = useState('')
  const [eveningEndHour, setEveningEndHour] = useState('')
  const [eveningEndMinute, setEveningEndMinute] = useState('')
  const [eveningEndPeriod, setEveningEndPeriod] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  return (
    <div className="font-manrope text-on-background bg-surface min-h-screen pb-24">
      <header className="sticky top-0 z-50 flex justify-between items-center px-6 py-4 w-full bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold tracking-tight text-teal-600">
            MedGenie
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors text-slate-500"
          >
            <span className="material-symbols-outlined">account_circle</span>
            <span className="text-sm font-semibold">Login</span>
          </Link>
        </div>
      </header>

      <main className="min-h-[calc(100vh-144px)] flex items-center justify-center py-16 px-6">
        <div className="w-full max-w-[640px] bg-white rounded-xl shadow-card overflow-hidden border border-slate-100">
          <div className="bg-surface-container-low px-8 py-6 border-b border-slate-200">
            <div className="flex justify-between items-end">
              <h1 className="text-4xl font-bold text-on-surface">Create a new account</h1>
            </div>
          </div>

          {error && (
            <div className="mx-8 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              {error}
            </div>
          )}

          <form
            className="p-8 space-y-6"
            onSubmit={(e) => {
              e.preventDefault()
              setError(null)
              const morningStart = composeTime12(morningStartHour, morningStartMinute, morningStartPeriod)
              const morningEnd = composeTime12(morningEndHour, morningEndMinute, morningEndPeriod)
              const eveningStart = composeTime12(eveningStartHour, eveningStartMinute, eveningStartPeriod)
              const eveningEnd = composeTime12(eveningEndHour, eveningEndMinute, eveningEndPeriod)
              if (!morningStart || !morningEnd) {
                setError('Please select complete OPD morning start and end time.')
                return
              }
              if (eveningEnabled && (!eveningStart || !eveningEnd)) {
                setError('Please select complete OPD evening start and end time.')
                return
              }
              if (password.length < 8) {
                setError('Password must be at least 8 characters (same as server sign up).')
                return
              }
              void (async () => {
                try {
                  setSubmitting(true)
                  const { email: regEmail, username, phone } = identityForRegister({
                    fullName,
                    email,
                    mobile,
                  })
                  const role = 'doctor'
                  const res = await registerAccount({
                    email: regEmail,
                    username,
                    password,
                    full_name: fullName.trim(),
                    phone,
                    role,
                    opd_morning_start: morningStart,
                    opd_morning_end: morningEnd,
                    opd_evening_enabled: eveningEnabled,
                    opd_evening_start: eveningEnabled ? eveningStart : null,
                    opd_evening_end: eveningEnabled ? eveningEnd : null,
                  })
                  persistAuthSession(res)
                  navigate('/dashboard', { replace: true })
                } catch (err) {
                  setError(getApiErrorMessage(err))
                } finally {
                  setSubmitting(false)
                }
              })()
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1 col-span-full">
                <label className="text-sm font-semibold text-on-surface-variant" htmlFor="full_name">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    id="full_name"
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. John Doe"
                    type="text"
                    value={fullName}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">person</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-on-surface-variant" htmlFor="mobile">
                  Mobile Number
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    id="mobile"
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="+91 00000 00000"
                    type="tel"
                    value={mobile}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">smartphone</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-on-surface-variant" htmlFor="email">
                  Email (Optional)
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    id="email"
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john.doe@medgenie.com"
                    type="email"
                    value={email}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">mail</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-on-surface-variant" htmlFor="mci">
                  Medical Registration Number (Optional)
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    id="mci"
                    placeholder="MCI/12345"
                    type="text"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">badge</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-on-surface-variant" htmlFor="specialty">
                  Specialty
                </label>
                <div className="relative">
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 appearance-none focus:ring-2 focus:ring-primary focus:border-primary outline-none text-slate-600"
                    id="specialty"
                    onChange={(e) => setSpecialty(e.target.value)}
                    value={specialty}
                  >
                    <option disabled value="">
                      Select Specialty
                    </option>
                    <option value="general">General Physician</option>
                    <option value="cardio">Cardiologist</option>
                    <option value="pediatric">Pediatrician</option>
                    <option value="ortho">Orthopedic Surgeon</option>
                    <option value="derm">Dermatologist</option>
                  </select>
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 pointer-events-none">stethoscope</span>
                </div>
              </div>

              <div className="space-y-1 col-span-full">
                <label className="text-sm font-semibold text-on-surface-variant">OPD Hours</label>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Morning Shift</p>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <select
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                        onChange={(e) => setMorningStartHour(e.target.value)}
                        value={morningStartHour}
                      >
                        <option value="">HH</option>
                        {HOUR_OPTIONS_12H.map((opt) => (
                          <option key={`msh-${opt}`} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <select
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                        onChange={(e) => setMorningStartMinute(e.target.value)}
                        value={morningStartMinute}
                      >
                        <option value="">MM</option>
                        {MINUTE_OPTIONS.map((opt) => (
                          <option key={`msm-${opt}`} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <select
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                        onChange={(e) => setMorningStartPeriod(e.target.value)}
                        value={morningStartPeriod}
                      >
                        <option value="">AM/PM</option>
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                      <span className="px-1 text-slate-500">to</span>
                      <select
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                        onChange={(e) => setMorningEndHour(e.target.value)}
                        value={morningEndHour}
                      >
                        <option value="">HH</option>
                        {HOUR_OPTIONS_12H.map((opt) => (
                          <option key={`meh-${opt}`} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <select
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                        onChange={(e) => setMorningEndMinute(e.target.value)}
                        value={morningEndMinute}
                      >
                        <option value="">MM</option>
                        {MINUTE_OPTIONS.map((opt) => (
                          <option key={`mem-${opt}`} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <select
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                        onChange={(e) => setMorningEndPeriod(e.target.value)}
                        value={morningEndPeriod}
                      >
                        <option value="">AM/PM</option>
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      checked={eveningEnabled}
                      className="h-4 w-4"
                      onChange={(e) => setEveningEnabled(e.target.checked)}
                      type="checkbox"
                    />
                    Evening shift available
                  </label>

                  {eveningEnabled && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Evening Shift</p>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <select
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                          onChange={(e) => setEveningStartHour(e.target.value)}
                          value={eveningStartHour}
                        >
                          <option value="">HH</option>
                          {HOUR_OPTIONS_12H.map((opt) => (
                            <option key={`esh-${opt}`} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        <select
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                          onChange={(e) => setEveningStartMinute(e.target.value)}
                          value={eveningStartMinute}
                        >
                          <option value="">MM</option>
                          {MINUTE_OPTIONS.map((opt) => (
                            <option key={`esm-${opt}`} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        <select
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                          onChange={(e) => setEveningStartPeriod(e.target.value)}
                          value={eveningStartPeriod}
                        >
                          <option value="">AM/PM</option>
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                        <span className="px-1 text-slate-500">to</span>
                        <select
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                          onChange={(e) => setEveningEndHour(e.target.value)}
                          value={eveningEndHour}
                        >
                          <option value="">HH</option>
                          {HOUR_OPTIONS_12H.map((opt) => (
                            <option key={`eeh-${opt}`} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        <select
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                          onChange={(e) => setEveningEndMinute(e.target.value)}
                          value={eveningEndMinute}
                        >
                          <option value="">MM</option>
                          {MINUTE_OPTIONS.map((opt) => (
                            <option key={`eem-${opt}`} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        <select
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                          onChange={(e) => setEveningEndPeriod(e.target.value)}
                          value={eveningEndPeriod}
                        >
                          <option value="">AM/PM</option>
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1 col-span-full">
                <label className="text-sm font-semibold text-on-surface-variant" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 pr-12 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    id="password"
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a secure password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                  />
                  <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary"
                    onClick={() => setShowPassword((prev) => !prev)}
                    type="button"
                  >
                    <span className="material-symbols-outlined">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-sm">info</span>
                  Minimum 8 characters (required by the server).
                </p>
              </div>
            </div>

            <div className="bg-primary-fixed/20 border-l-2 border-primary p-4 rounded-r-lg">
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-primary">auto_awesome</span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-on-primary-fixed">AI-Assisted Verification</p>
                  <p className="text-sm text-on-primary-fixed-variant opacity-80">
                    We use real-time MCI/NMC database verification to expedite your profile approval process.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-3">
              <button
                className="w-full py-4 bg-primary text-on-primary text-xl font-semibold rounded-lg hover:bg-primary-container transition-all shadow-lg active:scale-[0.98] disabled:opacity-60"
                disabled={submitting}
                type="submit"
              >
                {submitting ? 'Creating account…' : 'Save & Continue'}
              </button>
              <p className="text-center text-sm text-slate-500">
                By registering, you agree to our{' '}
                <a className="text-primary font-semibold hover:underline" href="#">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a className="text-primary font-semibold hover:underline" href="#">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </form>
        </div>
      </main>

      <footer className="fixed bottom-0 w-full z-50 flex justify-between items-center px-10 py-6 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-teal-600 text-sm">MedGenie</span>
          <span className="text-sm text-slate-600">
            © 2024 MedGenie. Empathetic Precision in Healthcare.
          </span>
        </div>
        <div className="flex gap-6">
          <a className="text-sm text-slate-500 hover:text-teal-500 hover:underline" href="#">
            Privacy Policy
          </a>
          <a className="text-sm text-slate-500 hover:text-teal-500 hover:underline" href="#">
            Terms of Service
          </a>
          <a className="text-sm text-slate-500 hover:text-teal-500 hover:underline" href="#">
            Help Center
          </a>
        </div>
      </footer>
    </div>
  )
}

export default SignupPage
