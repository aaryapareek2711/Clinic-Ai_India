import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'

import { getApiErrorMessage } from '../lib/apiClient'
import { loginWithPassword, persistAuthSession } from '../services/authApi'

function LoginPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col items-center px-4 py-10">
      <header className="mb-10 flex flex-col items-center">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-4xl">
            clinical_notes
          </span>
          <span className="text-3xl font-bold text-primary uppercase tracking-wide">
            MedGenie
          </span>
        </div>
      </header>

      <main className="w-full max-w-[480px]">
        <div className="bg-white rounded-xl shadow-card p-8 flex flex-col gap-6 border border-slate-100">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-on-surface mb-2">
              Welcome to MedGenie
            </h1>
            <p className="text-on-surface-variant">
              Enter your credentials to access your clinical workspace.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              {error}
            </div>
          )}

          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              setError(null)
              const u = usernameOrEmail.trim()
              const p = password
              if (!u || !p) {
                setError('Enter the email or username and password you used at sign up.')
                return
              }
              void (async () => {
                try {
                  setSubmitting(true)
                  const res = await loginWithPassword(u, p)
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
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-on-surface-variant" htmlFor="login-identity">
                Email or Phone Number
              </label>
              <div>
                <input
                  autoComplete="username"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  id="login-identity"
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="name@clinic.in"
                  type="text"
                  value={usernameOrEmail}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-on-surface-variant" htmlFor="login-password">
                  Password
                </label>
                <Link
                  className="text-xs font-semibold text-primary hover:underline"
                  to="/forgot-password"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                  lock_open
                </span>
                <input
                  autoComplete="current-password"
                  className="suppress-native-password-reveal w-full bg-surface-container-low border border-outline-variant rounded-lg py-3 pl-12 pr-12 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  id="login-password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary"
                  onClick={() => setShowPassword((prev) => !prev)}
                  type="button"
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <button
              className="w-full bg-primary text-on-primary py-3 rounded-lg font-semibold hover:bg-primary-container transition-all mt-2 disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              {submitting ? 'Signing in…' : 'Login'}
            </button>
          </form>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-outline-variant"></div>
            <span className="mx-4 text-xs font-semibold text-outline uppercase">
              or
            </span>
            <div className="flex-grow border-t border-outline-variant"></div>
          </div>

          <p className="text-center text-sm text-on-surface-variant">
            New to MedGenie?
            <Link className="text-primary font-bold hover:underline ml-1" to="/signup">
              Create an Account
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

export default LoginPage
