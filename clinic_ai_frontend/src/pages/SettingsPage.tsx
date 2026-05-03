import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SettingsHeadingNav from '../components/SettingsHeadingNav'
import NotificationsDrawer from './NotificationsDrawer'

function SettingsPage() {
  const navigate = useNavigate()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

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
              <div className="text-sm font-semibold text-[#171d16]">Dr. Rajesh Kumar</div>
              <div className="text-[11px] text-gray-500 uppercase font-bold tracking-tight">Oncology Specialist</div>
            </div>
            <img
              alt="Dr. Profile"
              className="w-10 h-10 rounded-full object-cover border-2 border-[#00873a]"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDaAYeQ0A8oF3vIfyLdOprOJ5SFTNVVvmJSbHXZgI1_hK5qpkoXqwV_MO6PstghTFvZxhRr4w_9UWJvAuxv6BAaL2Ki9iaopyTFj53ErGUzDUt0DPmIeEPkQ8QLnp9zdKrG7mSUR7QCKypwjDYeVy0wWE4WvCPcfkiJCCHGOCDYuuQZDw9ZSoHuRR0Y5GdkcuGswFoLmCDphSSFTzmWLMexlxM302h34UI87UnGQ_WgZ6-lEVzJP2xIG0bNin24u6kGXLX5-NY36vdO"
            />
          </div>
        </div>
      </header>

      <main className="min-h-screen pt-16">
        <div className="bg-[#f4fcf0] px-5 pb-4 pt-8 sm:px-8">
          <SettingsHeadingNav showTabs={false} variant="wide" />
        </div>

        <section className="relative z-0 overflow-hidden bg-gradient-to-b from-[#0f172a] via-[#111827] to-[#0b1120] px-5 pb-10 pt-6 text-white sm:px-7 sm:pt-7">
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
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6 lg:gap-8">
                <div className="relative shrink-0">
                  <div className="flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-full bg-gradient-to-br from-[#22c55e] via-[#16a34a] to-[#2563eb] shadow-lg shadow-black/30 ring-2 ring-white/[0.12] ring-offset-2 ring-offset-[#111827] sm:h-24 sm:w-24">
                    <span className="select-none text-2xl font-bold tracking-tight text-white drop-shadow-sm sm:text-[1.75rem]">RK</span>
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
                      Dr. Rajesh Kumar
                    </h1>
                    <span className="inline-flex shrink-0 items-center rounded-full border border-white/[0.12] bg-white/[0.08] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/95">
                      Active
                    </span>
                  </div>
                  <p className="mx-auto max-w-xl text-sm leading-snug text-slate-300 sm:mx-0">
                    Senior Consultant Oncology &amp; Palliative Care
                  </p>
                  <dl className="mx-auto mt-3 flex max-w-xl flex-col gap-2 sm:mx-0 sm:flex-row sm:flex-wrap">
                    <div className="flex flex-1 justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 backdrop-blur-sm sm:flex-initial sm:justify-start">
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined mt-px text-[1rem] text-emerald-300/90">badge</span>
                        <div className="min-w-0 text-left leading-tight">
                          <dt className="sr-only">Registration number</dt>
                          <dd className="text-[12px] font-medium text-white/95">MED-8923-GNE-2024</dd>
                          <dd className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Reg. no.</dd>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-1 justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 backdrop-blur-sm sm:flex-initial sm:justify-start">
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined mt-px text-[1rem] text-emerald-300/90">location_on</span>
                        <div className="min-w-0 text-left leading-tight">
                          <dt className="sr-only">Primary site</dt>
                          <dd className="text-[12px] font-medium text-white/95">Metro City General, Wing B</dd>
                          <dd className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Site</dd>
                        </div>
                      </div>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-center lg:justify-end">
                <button
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#16a34a] px-4 text-[13px] font-semibold text-white shadow-md shadow-emerald-950/25 transition hover:bg-[#15803d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
                  onClick={() => navigate('/settings/edit-profile')}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[1.125rem]">edit</span>
                  Edit Profile
                </button>
                <button
                  aria-label="Share profile"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.06] text-white transition hover:bg-white/[0.12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/30"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[1.125rem]">share</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-7xl bg-[#f4fcf0] px-8 pb-12 pt-8">
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
                      rajesh.kumar@medgenie.pro
                    </div>
                  </div>
                  <div className="group">
                    <label className="text-[13px] tracking-[0.05em] text-gray-400 block mb-1">PHONE NUMBER</label>
                    <div className="flex items-center gap-3 text-[#171d16] font-medium">
                      <span className="material-symbols-outlined text-gray-400 group-hover:text-[#006b2c] transition-colors">call</span>
                      +91 98234 56710
                    </div>
                  </div>
                  <div className="group">
                    <label className="text-[13px] tracking-[0.05em] text-gray-400 block mb-1">PRIMARY CLINIC</label>
                    <div className="flex items-center gap-3 text-[#171d16] font-medium">
                      <span className="material-symbols-outlined text-gray-400 group-hover:text-[#006b2c] transition-colors">home_health</span>
                      Hope Oncology Center, Floor 4
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Mon - Fri</span>
                    <span className="font-semibold text-[#171d16]">09:00 AM - 05:00 PM</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Saturday</span>
                    <span className="font-semibold text-[#171d16]">10:00 AM - 01:00 PM</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Sunday</span>
                    <span className="text-[#ba1a1a] font-semibold">Closed</span>
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
                  <div className="text-3xl font-extrabold text-[#171d16]">1,284</div>
                  <div className="text-[13px] tracking-[0.05em] text-gray-500 mt-1">PATIENTS THIS MONTH</div>
                  <div className="mt-4 flex items-center justify-center text-xs text-green-600 font-bold">
                    <span className="material-symbols-outlined text-sm">trending_up</span>
                    12% vs last month
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col justify-center text-center">
                  <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined">stethoscope</span>
                  </div>
                  <div className="text-3xl font-extrabold text-[#171d16]">24</div>
                  <div className="text-[13px] tracking-[0.05em] text-gray-500 mt-1">VISITS TODAY</div>
                  <div className="mt-4 flex items-center justify-center text-xs text-blue-600 font-bold">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    4 slots remaining
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col justify-center text-center">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined">avg_time</span>
                  </div>
                  <div className="text-3xl font-extrabold text-[#171d16]">18m</div>
                  <div className="text-[13px] tracking-[0.05em] text-gray-500 mt-1">AVG CONSULT TIME</div>
                  <div className="mt-4 flex items-center justify-center text-xs text-amber-600 font-bold">
                    <span className="material-symbols-outlined text-sm">speed</span>
                    Within benchmark
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
      </main>

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}

export default SettingsPage
