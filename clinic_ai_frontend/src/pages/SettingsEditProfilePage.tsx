import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SettingsHeadingNav from '../components/SettingsHeadingNav'
import NotificationsDrawer from './NotificationsDrawer'
import { fetchMyProfile, getApiErrorMessage, patchMyProfile } from '../services/profileApi'

const DEMO_PROFILE = {
  email: 'rajesh.kumar@medgenie.pro',
  username: 'rajesh.kumar',
  full_name: 'Dr. Rajesh Kumar',
  phone: '+91 98234 56710',
  role: 'doctor',
  job_title: 'Oncology Specialist',
  medical_license_number: 'MED-8923-GNE-2024',
  avatar_url:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDaAYeQ0A8oF3vIfyLdOprOJ5SFTNVVvmJSbHXZgI1_hK5qpkoXqwV_MO6PstghTFvZxhRr4w_9UWJvAuxv6BAaL2Ki9iaopyTFj53ErGUzDUt0DPmIeEPkQ8QLnp9zdKrG7mSUR7QCKypwjDYeVy0wWE4WvCPcfkiJCCHGOCDYuuQZDw9ZSoHuRR0Y5GdkcuGswFoLmCDphSSFTzmWLMexlxM302h34UI87UnGQ_WgZ6-lEVzJP2xIG0bNin24u6kGXLX5-NY36vdO',
}

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

function SettingsEditProfilePage() {
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

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setBanner(null)
    if (!hasAuthToken()) {
      setFullName(DEMO_PROFILE.full_name)
      setJobTitle(DEMO_PROFILE.job_title ?? '')
      setEmailDisplay(DEMO_PROFILE.email)
      setPhone(DEMO_PROFILE.phone ?? '')
      setLicense(DEMO_PROFILE.medical_license_number ?? '')
      setAvatarUrl(DEMO_PROFILE.avatar_url ?? '')
      setLoading(false)
      return
    }
    try {
      const me = await fetchMyProfile()
      setFullName(me.full_name ?? '')
      setJobTitle(me.job_title ?? '')
      setEmailDisplay(me.email ?? '')
      setPhone(me.phone ?? '')
      setLicense(me.medical_license_number ?? '')
      setAvatarUrl(me.avatar_url ?? '')
    } catch {
      setFullName(DEMO_PROFILE.full_name)
      setJobTitle(DEMO_PROFILE.job_title ?? '')
      setEmailDisplay(DEMO_PROFILE.email)
      setPhone(DEMO_PROFILE.phone ?? '')
      setLicense(DEMO_PROFILE.medical_license_number ?? '')
      setAvatarUrl(DEMO_PROFILE.avatar_url ?? '')
      setBanner({ type: 'err', text: 'Could not load profile from server. Showing demo values.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  useEffect(() => {
    return () => {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl)
    }
  }, [previewBlobUrl])

  const avatarSrc = previewBlobUrl || avatarUrl.trim() || DEMO_PROFILE.avatar_url || ''

  const strength = useMemo(
    () => profileStrengthPct({ full_name: fullName, job_title: jobTitle, phone, medical_license_number: license, avatar_url: avatarUrl }),
    [fullName, jobTitle, phone, license, avatarUrl],
  )

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBanner(null)
    if (!fullName.trim()) {
      setBanner({ type: 'err', text: 'Full name is required.' })
      return
    }
    if (!hasAuthToken()) {
      setBanner({
        type: 'err',
        text: 'Sign in with an account that stores an access token to save changes to the server.',
      })
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
      setPhone(updated.phone ?? '')
      setLicense(updated.medical_license_number ?? '')
      setAvatarUrl(updated.avatar_url ?? '')
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl)
      setPreviewBlobUrl(null)
      setBanner({ type: 'ok', text: 'Profile updated successfully.' })
    } catch (err) {
      setBanner({ type: 'err', text: getApiErrorMessage(err) })
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
      <header className="fixed top-0 right-0 z-40 flex h-16 w-[calc(100%-240px)] items-center justify-end border-b border-gray-200 bg-white px-8">
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
            <img
              alt=""
              className="h-10 w-10 rounded-full border-2 border-[#00873a] object-cover"
              src={avatarSrc}
            />
          </div>
        </div>
      </header>

      <main className="min-h-screen bg-[#f4fcf0] p-8 pt-16">
        <div className="mx-auto max-w-6xl">
          <SettingsHeadingNav />

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
                    <img
                      alt=""
                      className="h-24 w-24 rounded-full border-4 border-[#eff6ea] object-cover shadow-sm"
                      src={avatarSrc}
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

              <form className={loading ? 'pointer-events-none opacity-60' : ''} onSubmit={handleSubmit}>
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
