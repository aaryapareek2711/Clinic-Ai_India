import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NotificationsDrawer from './NotificationsDrawer'

function SettingsPage() {
  const navigate = useNavigate()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  return (
    <div className="bg-[#f4fcf0] text-[#171d16] antialiased min-h-screen font-manrope">
      <aside className="w-[240px] h-full fixed left-0 top-0 bg-[#111827] border-r border-gray-800 flex flex-col py-6 text-sm z-50">
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#16a34a] rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-xl">medical_services</span>
          </div>
          <div>
            <div className="text-xl font-bold text-white leading-none">MedGenie</div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mt-1">Provider</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          <button className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center px-4 py-2 hover:bg-gray-800 w-full" onClick={() => navigate('/dashboard')} type="button">
            <span className="material-symbols-outlined mr-3">dashboard</span> Dashboard
          </button>
          <button className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center px-4 py-2 hover:bg-gray-800 w-full" onClick={() => navigate('/calendar')} type="button">
            <span className="material-symbols-outlined mr-3">calendar_today</span> Calendar
          </button>
          <button className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center px-4 py-2 hover:bg-gray-800 w-full" onClick={() => navigate('/visits')} type="button">
            <span className="material-symbols-outlined mr-3">clinical_notes</span> Visits
          </button>
          <a className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center px-4 py-2 hover:bg-gray-800" href="#">
            <span className="material-symbols-outlined mr-3">description</span> Templates
          </a>
          <button className="bg-[#2563eb] text-white rounded-lg mx-2 flex items-center px-4 py-2 border-l-4 border-white active:scale-[0.98] transition-all w-[calc(100%-1rem)]" type="button">
            <span className="material-symbols-outlined mr-3">settings</span> Settings
          </button>
        </nav>
        <div className="mt-auto px-4">
          <a className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center px-4 py-2 hover:bg-gray-800 rounded-lg" href="#">
            <span className="material-symbols-outlined mr-3">logout</span> Logout
          </a>
        </div>
      </aside>

      <header className="fixed top-0 right-0 w-[calc(100%-240px)] h-16 bg-white border-b border-gray-200 flex items-center justify-end px-8 z-40">
        <div className="flex items-center gap-6">
          <button className="text-gray-500 hover:opacity-80 transition-opacity" type="button">
            <span className="material-symbols-outlined">language</span>
          </button>
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

      <main className="ml-[240px] pt-16 min-h-screen">
        <section className="bg-[#111827] text-white pt-12 pb-24 px-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0 100 C 20 0 50 0 100 100" fill="none" stroke="white" strokeWidth="0.5" />
            </svg>
          </div>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-8 relative z-10">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-[#16a34a] to-[#2563eb] flex items-center justify-center border-4 border-white shadow-xl">
                <span className="text-4xl font-extrabold tracking-tighter text-white">RK</span>
              </div>
              <div className="absolute bottom-1 right-1 w-8 h-8 bg-[#006b2c] rounded-full border-4 border-[#111827] flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              </div>
            </div>
            <div className="text-center md:text-left flex-1">
              <div className="flex items-center gap-4 justify-center md:justify-start">
                <h1 className="text-[28px] leading-tight tracking-[-0.02em] font-bold">Dr. Rajesh Kumar</h1>
                <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-widest border border-white/20">Active</span>
              </div>
              <p className="text-white/70 mt-1">Senior Consultant Oncology &amp; Palliative Care</p>
              <div className="flex flex-wrap items-center gap-6 mt-4 text-sm text-white/60">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-[#7ffc97]">badge</span>
                  <span>Reg No: MED-8923-GNE-2024</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-[#7ffc97]">location_on</span>
                  <span>Metro City General, Wing B</span>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                className="px-6 py-3 bg-[#16a34a] text-white font-semibold rounded-lg hover:opacity-90 transition-all flex items-center gap-2"
                onClick={() => navigate('/settings/edit-profile')}
                type="button"
              >
                <span className="material-symbols-outlined">edit</span> Edit Profile
              </button>
              <button className="p-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all" type="button">
                <span className="material-symbols-outlined">share</span>
              </button>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-8 -mt-16 pb-12">
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

              <div className="bg-[#111827] rounded-xl p-8 flex items-center justify-between text-white overflow-hidden relative">
                <div className="relative z-10">
                  <div className="text-xl font-bold mb-2">HIPAA &amp; GDPR Compliant</div>
                  <p className="text-gray-400 text-sm max-w-md">
                    Your data is encrypted using AES-256 standard. MedGenie ensures that all provider interactions are logged and secure within the National Digital Health Mission framework.
                  </p>
                </div>
                <span className="material-symbols-outlined text-7xl text-white/10 absolute -right-4 -bottom-4 rotate-12">shield_with_heart</span>
                <div className="relative z-10 px-6 py-2 border-2 border-[#16a34a] rounded-lg text-[#16a34a] font-bold text-xs tracking-widest uppercase">
                  Secure Shell
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
