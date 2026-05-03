import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NotificationsDrawer from './NotificationsDrawer'

function NewVisitPage() {
  const navigate = useNavigate()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  return (
    <div className="bg-[#f4fcf0] text-[#171d16] antialiased min-h-screen font-manrope">
      <nav className="w-[240px] h-full fixed left-0 top-0 bg-[#111827] flex flex-col py-6 border-r border-gray-800 z-50">
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#16a34a] rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-lg">medical_services</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight leading-none">MedGenie</h1>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mt-1">Provider</p>
          </div>
        </div>
        <div className="flex-1 flex flex-col space-y-1 px-2">
          <button className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center px-4 py-2 hover:bg-gray-800 rounded-lg w-full" onClick={() => navigate('/dashboard')} type="button">
            <span className="material-symbols-outlined mr-3">dashboard</span>
            <span className="text-sm">Dashboard</span>
          </button>
          <button className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center px-4 py-2 hover:bg-gray-800 rounded-lg w-full" onClick={() => navigate('/calendar')} type="button">
            <span className="material-symbols-outlined mr-3">calendar_today</span>
            <span className="text-sm">Calendar</span>
          </button>
          <button className="bg-[#2563eb] text-white rounded-lg flex items-center px-4 py-2 border-l-4 border-white transition-all scale-[0.98] w-full" onClick={() => navigate('/visits')} type="button">
            <span className="material-symbols-outlined mr-3">clinical_notes</span>
            <span className="text-sm">Visits</span>
          </button>
          <button className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center px-4 py-2 hover:bg-gray-800 rounded-lg w-full" onClick={() => navigate('/templates')} type="button">
            <span className="material-symbols-outlined mr-3">description</span>
            <span className="text-sm">Templates</span>
          </button>
        </div>
        <div className="mt-auto px-2 space-y-1">
          <button className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center px-4 py-2 hover:bg-gray-800 rounded-lg w-full" onClick={() => navigate('/settings')} type="button">
            <span className="material-symbols-outlined mr-3">settings</span>
            <span className="text-sm">Settings</span>
          </button>
          <button className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center px-4 py-2 hover:bg-gray-800 rounded-lg w-full" onClick={() => navigate('/login')} type="button">
            <span className="material-symbols-outlined mr-3">logout</span>
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </nav>

      <header className="fixed top-0 right-0 w-[calc(100%-240px)] h-16 bg-white border-b border-gray-200 flex items-center justify-end px-8 z-40">
        <div className="flex items-center gap-6">
          <button className="text-gray-500 hover:opacity-80 transition-opacity flex items-center" type="button">
            <span className="material-symbols-outlined">language</span>
          </button>
          <button className="text-gray-500 hover:opacity-80 transition-opacity flex items-center relative" onClick={() => setIsNotificationsOpen(true)} type="button">
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

      <main className="ml-[240px] pt-16 min-h-screen">
        <div className="p-8 max-w-7xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <nav className="flex items-center gap-2 text-sm text-[#3e4a3d] mb-2">
                <span>Visits</span>
                <span className="material-symbols-outlined text-sm">chevron_right</span>
                <span className="font-medium text-[#006b2c]">New Visit</span>
              </nav>
              <h2 className="text-[28px] leading-[1.2] tracking-[-0.02em] font-bold">Create New Visit</h2>
            </div>
            <div className="flex gap-4">
              <button className="px-6 py-2 bg-white border border-gray-200 text-[#111827] font-semibold rounded-lg hover:bg-gray-50 transition-colors" onClick={() => navigate('/dashboard')} type="button">
                Cancel
              </button>
              <button className="px-6 py-2 bg-[#16a34a] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm" type="button">
                <span className="material-symbols-outlined text-[20px]">save</span>
                Confirm Registration
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-[#00873a]/10 flex items-center justify-center text-[#006b2c]">
                    <span className="material-symbols-outlined">person_add</span>
                  </div>
                  <h3 className="text-[18px] leading-[1.4] font-semibold">New Patient Registration</h3>
                </div>
                <form className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 space-y-2">
                      <label className="block text-[13px] tracking-[0.05em] text-[#3e4a3d] uppercase">Full Name</label>
                      <input className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all" placeholder="e.g. Johnathan Smith" type="text" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[13px] tracking-[0.05em] text-[#3e4a3d] uppercase">Mobile Number</label>
                      <input className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all" placeholder="+1 (555) 000-0000" type="tel" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[13px] tracking-[0.05em] text-[#3e4a3d] uppercase">Age</label>
                      <input className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all" placeholder="24" type="number" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[13px] tracking-[0.05em] text-[#3e4a3d] uppercase">Gender</label>
                      <select className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent appearance-none bg-white" defaultValue="">
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer_not">Prefer not to say</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[13px] tracking-[0.05em] text-[#3e4a3d] uppercase">Language Preference</label>
                      <select className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent appearance-none bg-white" defaultValue="english">
                        <option value="english">English (US)</option>
                        <option value="spanish">Spanish</option>
                        <option value="french">French</option>
                        <option value="mandarin">Mandarin</option>
                      </select>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-start gap-3">
                      <input className="mt-1 h-4 w-4 rounded border-gray-300 text-[#006b2c] focus:ring-[#006b2c]" id="consent" type="checkbox" />
                      <label className="text-sm text-gray-500" htmlFor="consent">The patient has consented to digital health records processing and privacy terms as per clinical standards.</label>
                    </div>
                  </div>
                </form>
              </div>

              <div className="bg-[#111827] rounded-xl p-8 text-white flex items-center justify-between overflow-hidden relative">
                <div className="relative z-10 max-w-sm">
                  <h4 className="text-lg font-semibold mb-2">Automated Medical History</h4>
                  <p className="text-gray-400 text-sm">MedGenie can automatically sync previous laboratory results and medications using the national patient database.</p>
                </div>
                <div className="relative z-10">
                  <button className="bg-[#2563eb] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors" type="button">Check DB</button>
                </div>
                <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-[#006b2c]/20 to-transparent" />
              </div>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-[#00873a]/10 flex items-center justify-center text-[#006b2c]">
                    <span className="material-symbols-outlined">calendar_month</span>
                  </div>
                  <h3 className="text-[18px] leading-[1.4] font-semibold">Appointment Booking</h3>
                </div>
                <div className="space-y-6 flex-1">
                  <div className="space-y-2">
                    <label className="block text-[13px] tracking-[0.05em] text-[#3e4a3d] uppercase">Select Date</label>
                    <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-gray-400 mb-2">
                      <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      <button className="h-9 rounded-md flex items-center justify-center text-gray-300" type="button">28</button>
                      <button className="h-9 rounded-md flex items-center justify-center text-gray-300" type="button">29</button>
                      <button className="h-9 rounded-md flex items-center justify-center text-gray-300" type="button">30</button>
                      <button className="h-9 rounded-md flex items-center justify-center text-gray-900 hover:bg-gray-100" type="button">1</button>
                      <button className="h-9 rounded-md flex items-center justify-center text-gray-900 hover:bg-gray-100" type="button">2</button>
                      <button className="h-9 rounded-md flex items-center justify-center bg-[#2563eb] text-white font-bold" type="button">3</button>
                      <button className="h-9 rounded-md flex items-center justify-center text-gray-900 hover:bg-gray-100" type="button">4</button>
                      <button className="h-9 rounded-md flex items-center justify-center text-gray-900 hover:bg-gray-100" type="button">5</button>
                      <button className="h-9 rounded-md flex items-center justify-center text-gray-900 hover:bg-gray-100" type="button">6</button>
                      <button className="h-9 rounded-md flex items-center justify-center text-gray-900 hover:bg-gray-100" type="button">7</button>
                      <button className="h-9 rounded-md flex items-center justify-center text-gray-900 hover:bg-gray-100" type="button">8</button>
                      <button className="h-9 rounded-md flex items-center justify-center text-gray-900 hover:bg-gray-100" type="button">9</button>
                      <button className="h-9 rounded-md flex items-center justify-center text-gray-900 hover:bg-gray-100" type="button">10</button>
                      <button className="h-9 rounded-md flex items-center justify-center text-gray-900 hover:bg-gray-100" type="button">11</button>
                    </div>
                    <div className="mt-4 p-3 bg-[#eff6ea] rounded-lg flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#006b2c] text-[20px]">event_available</span>
                      <span className="text-sm font-medium">Selected: October 3, 2023</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-[13px] tracking-[0.05em] text-[#3e4a3d] uppercase">Time Slot Dropdown</label>
                    <div className="relative">
                      <select className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent appearance-none bg-white" defaultValue="0900">
                        <option value="0900">09:00 AM - General Checkup</option>
                        <option value="1030">10:30 AM - Consultation</option>
                        <option value="1300">01:00 PM - Follow-up</option>
                        <option value="1530">03:30 PM - Emergency Slot</option>
                      </select>
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                        <span className="material-symbols-outlined">expand_more</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div className="p-3 border border-[#00873a] bg-[#00873a]/5 rounded-lg flex flex-col">
                        <span className="text-[10px] text-[#006b2c] uppercase font-bold tracking-wider">Morning</span>
                        <span className="text-sm font-medium">2 Slots Open</span>
                      </div>
                      <div className="p-3 border border-gray-100 bg-gray-50 rounded-lg flex flex-col">
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Afternoon</span>
                        <span className="text-sm font-medium">Fully Booked</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mt-auto">
                    <label className="block text-[13px] tracking-[0.05em] text-[#3e4a3d] uppercase">Visit Type</label>
                    <div className="flex gap-3">
                      <button className="flex-1 py-2 rounded-lg border-2 border-[#006b2c] text-[#006b2c] font-semibold text-sm" type="button">Physical</button>
                      <button className="flex-1 py-2 rounded-lg border-2 border-transparent bg-gray-100 text-gray-500 font-semibold text-sm" type="button">Virtual</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#e3eadf] rounded-xl border border-[#bdcaba] p-6">
                <h4 className="text-sm font-semibold mb-4">Summary Preview</h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#3e4a3d]">Patient Status</span>
                    <span className="bg-[#22c55e]/10 text-[#22c55e] px-2 py-0.5 rounded-full text-[12px] font-bold">NEW REGISTER</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#3e4a3d]">Provider</span>
                    <span className="font-medium">Dr. Jenkins</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#3e4a3d]">Registration Fee</span>
                    <span className="font-bold text-gray-900">$45.00</span>
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
