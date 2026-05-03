import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NotificationsDrawer from './NotificationsDrawer'

function ProviderDashboardPage() {
  const navigate = useNavigate()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  return (
    <div className="bg-[#f4fcf0] text-[#171d16] min-h-screen font-manrope">
      <aside className="w-[240px] h-full fixed left-0 top-0 bg-[#111827] text-sm border-r border-gray-800 flex flex-col py-6 z-50">
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#16a34a] rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-xl">medical_services</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white leading-none">MedGenie</h1>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-1">Provider</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          <a className="bg-[#2563eb] text-white rounded-lg mx-2 flex items-center px-4 py-2 border-l-4 border-white" href="#">
            <span className="material-symbols-outlined mr-3">dashboard</span>Dashboard
          </a>
          <button
            className="text-gray-400 hover:text-white flex items-center px-4 py-2 hover:bg-gray-800 w-full"
            onClick={() => navigate('/patients')}
            type="button"
          >
            <span className="material-symbols-outlined mr-3">group</span>Patients
          </button>
          <button
            className="text-gray-400 hover:text-white flex items-center px-4 py-2 hover:bg-gray-800 w-full"
            onClick={() => navigate('/calendar')}
            type="button"
          >
            <span className="material-symbols-outlined mr-3">calendar_today</span>Calendar
          </button>
          <button
            className="text-gray-400 hover:text-white flex items-center px-4 py-2 hover:bg-gray-800 w-full"
            onClick={() => navigate('/visits')}
            type="button"
          >
            <span className="material-symbols-outlined mr-3">clinical_notes</span>Visit Management
          </button>
          <button
            className="text-gray-400 hover:text-white flex items-center px-4 py-2 hover:bg-gray-800 w-full"
            onClick={() => navigate('/templates')}
            type="button"
          >
            <span className="material-symbols-outlined mr-3">description</span>Templates
          </button>
          <button
            className="text-gray-400 hover:text-white flex items-center px-4 py-2 hover:bg-gray-800 w-full"
            onClick={() => navigate('/settings')}
            type="button"
          >
            <span className="material-symbols-outlined mr-3">settings</span>Settings
          </button>
        </nav>
      </aside>

      <main className="ml-[240px] min-h-screen">
        <header className="fixed top-0 right-0 w-[calc(100%-240px)] h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-40">
          <div className="w-[360px]">
            <input className="w-full bg-[#f6f8fa] border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-[#16a34a]" placeholder="Search patient, visit, or note..." type="text" />
          </div>
          <div className="flex items-center gap-6">
            <button className="text-gray-500 hover:opacity-80 transition-opacity" onClick={() => setIsNotificationsOpen(true)} type="button">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold">Dr. Priya Sharma</p>
                <p className="text-[11px] text-gray-500">Chief Medical Officer</p>
              </div>
              <img alt="Doctor profile" className="w-10 h-10 rounded-full border-2 border-[#00873a] object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDmLslVj5RCo4iVzLVkg4iLF5K0IGThve1Krsg5uG_8IR-zzqtv_T0DxGsna7gxj9GB48MdNFYRYEVwCp7mIkOdyNUEbY4COHxeV5Knq7EBi5560viCinntR5P03aRhQ6T42Qv-XBON6b_d4lUR4yovDuXcamJ8zvz7dZwnW4hI8JxWtvKAHfoyY7QUVtyARBV_KL3IVyA50J8ZYEOSghFOxC7lSAYLlbayIhX16TSEZ2wD9Yz70kltap5nt2XVt5s-i05CspQ6mOfr" />
            </div>
          </div>
        </header>

        <section className="mt-16 bg-[#111827] h-[120px] px-8 flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-bold text-white">Provider Dashboard</h1>
            <p className="text-sm text-[#9ca3af]">Welcome back, Dr. Priya Sharma</p>
          </div>
          <div className="flex gap-3">
            <button
              className="flex items-center gap-2 bg-[#16a34a] text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90 w-fit"
              onClick={() => navigate('/new-visit')}
              type="button"
            >
              <span className="material-symbols-outlined">add</span>
              New Visit
            </button>
            <button className="px-4 py-2 bg-[#7c3aed] text-white rounded-lg text-sm font-medium">CarePrep</button>
          </div>
        </section>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-[#e5e7eb]">
              <p className="text-[13px] uppercase text-gray-500">Patients Today</p>
              <h3 className="text-3xl font-bold mt-1">12</h3>
              <p className="text-xs text-[#22c55e] mt-2">+3 from yesterday</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-[#e5e7eb]">
              <p className="text-[13px] uppercase text-gray-500">High Risk</p>
              <h3 className="text-3xl font-bold mt-1">02</h3>
              <p className="text-xs text-red-500 mt-2">Patients need attention</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-[#e5e7eb]">
              <p className="text-[13px] uppercase text-gray-500">Pending Tasks</p>
              <h3 className="text-3xl font-bold mt-1">05</h3>
              <p className="text-xs text-amber-600 mt-2">3 high priority</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-[#e5e7eb]">
              <p className="text-[13px] uppercase text-gray-500">OPD Notes</p>
              <h3 className="text-2xl font-bold mt-1">All complete ✓</h3>
              <p className="text-xs text-gray-400 mt-2">Latest: 2:30 PM</p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-8 space-y-8">
              <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-[18px] font-semibold">Upcoming Schedule</h2>
                  <p className="text-xs text-gray-500 mt-1">8 appointments - click patient name for pre-visit prep</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {[
                    ['Amit Jaiswal', 'Hypertension Follow-up', '10:30 AM'],
                    ['Sonia Rao', 'Post-Op Consultation', '11:15 AM'],
                    ['Pawan Kumar', 'Annual Wellness Visit', '12:00 PM'],
                    ['Meera Tyagi', 'Lab Results Review', '12:45 PM'],
                  ].map(([name, type, time]) => (
                    <div key={name} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{name}</p>
                        <p className="text-xs text-gray-500">Type: {type}</p>
                      </div>
                      <p className="text-sm font-medium">{time}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-[18px] font-semibold">Recent Visits &amp; OPD Notes</h2>
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
                      <th className="px-6 py-4 font-semibold">Visit Title</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-6 py-4 font-medium">Cardiology Consultation - R. Sharma</td>
                      <td className="px-6 py-4"><span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase">Completed</span></td>
                      <td className="px-6 py-4 text-sm text-gray-500">Oct 24, 2023</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-medium">Post-Op Review - K. Singhania</td>
                      <td className="px-6 py-4"><span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase">In Progress</span></td>
                      <td className="px-6 py-4 text-sm text-gray-500">Oct 24, 2023</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="col-span-4">
              <div className="relative bg-gradient-to-br from-[#00873a] to-[#006b2c] rounded-xl p-6 text-white min-h-[220px] flex flex-col justify-end">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1">New Feature</p>
                <h3 className="text-xl font-bold leading-tight">AI Note Transcription is now 2x faster.</h3>
                <button className="mt-4 px-4 py-1.5 bg-white text-[#006b2c] rounded-full text-xs font-bold w-fit">Try Now</button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}

export default ProviderDashboardPage
