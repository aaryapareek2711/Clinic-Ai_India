import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NotificationsDrawer from './NotificationsDrawer'

function CalendarPage() {
  const navigate = useNavigate()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  return (
    <div className="bg-[#f4fcf0] font-inter text-[#171d16] min-h-screen">
      <aside className="w-[240px] h-full fixed left-0 top-0 bg-[#111827] border-r border-gray-800 flex flex-col py-6 z-50">
        <div className="px-6 mb-10">
          <h1 className="text-xl font-bold text-white">MedGenie</h1>
          <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Provider</p>
        </div>
        <nav className="flex-1 space-y-1">
          <button className="text-gray-400 hover:text-white flex items-center px-4 py-2 hover:bg-gray-800 w-full" onClick={() => navigate('/dashboard')} type="button">
            <span className="material-symbols-outlined mr-3">dashboard</span>
            Dashboard
          </button>
          <a className="bg-[#2563eb] text-white rounded-lg mx-2 flex items-center px-4 py-2 border-l-4 border-white" href="#">
            <span className="material-symbols-outlined mr-3">calendar_today</span>
            Calendar
          </a>
          <button className="text-gray-400 hover:text-white flex items-center px-4 py-2 hover:bg-gray-800 w-full" onClick={() => navigate('/visits')} type="button">
            <span className="material-symbols-outlined mr-3">clinical_notes</span>
            Visit Management
          </button>
          <button className="text-gray-400 hover:text-white flex items-center px-4 py-2 hover:bg-gray-800 w-full" onClick={() => navigate('/templates')} type="button">
            <span className="material-symbols-outlined mr-3">description</span>
            Templates
          </button>
        </nav>
      </aside>

      <header className="fixed top-0 right-0 w-[calc(100%-240px)] h-16 bg-white border-b border-gray-200 flex items-center justify-end px-8 z-40">
        <div className="flex items-center gap-6">
          <span className="material-symbols-outlined text-gray-500 cursor-pointer">language</span>
          <button className="text-gray-500 hover:opacity-80 transition-opacity" onClick={() => setIsNotificationsOpen(true)} type="button">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div className="flex items-center gap-3 ml-2">
            <div className="text-right">
              <p className="text-sm font-semibold">Dr. Profile</p>
              <p className="text-[10px] text-[#3e4a3d] uppercase">Chief Surgeon</p>
            </div>
          </div>
        </div>
      </header>

      <main className="ml-[240px] pt-16 min-h-screen p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-[28px] font-bold">Calendar</h2>
            <p className="text-[#3e4a3d]">Manage your appointments and schedule</p>
          </div>
          <div className="flex gap-3">
            <button className="bg-[#111827] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-medium">Import CSV</button>
            <button className="bg-[#16a34a] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-medium" onClick={() => navigate('/new-appointment')} type="button">New Appointment</button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-8 bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold">October 2024</h3>
              <div className="flex bg-[#eff6ea] p-1 rounded-lg">
                <button className="px-4 py-1.5 text-sm font-medium bg-white text-[#006b2c] rounded-md shadow-sm">Month</button>
                <button className="px-4 py-1.5 text-sm font-medium text-[#3e4a3d]">Week</button>
                <button className="px-4 py-1.5 text-sm font-medium text-[#3e4a3d]">Day</button>
              </div>
            </div>
            <div className="grid grid-cols-7 border-b border-gray-100">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
                <div key={d} className="py-3 text-center border-r border-gray-100 text-[13px] font-medium text-[#3e4a3d] last:border-r-0">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 auto-rows-[120px]">
              {Array.from({ length: 28 }).map((_, i) => (
                <div key={i} className="p-2 border-r border-b border-gray-100 hover:bg-[#eff6ea] transition-colors last:border-r-0">
                  <span className="text-sm font-medium">{i + 1}</span>
                  {i === 2 && <div className="mt-2 text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200 truncate">09:00 Follow-up: Jane Doe</div>}
                  {i === 5 && <div className="mt-2 text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded border border-green-200 truncate">10:00 Confirmed: Alice R.</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="xl:col-span-4 flex flex-col gap-8">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-[18px] font-semibold">Upcoming Appointments</h3>
                <button className="text-[#006b2c] text-sm font-semibold hover:underline">View All</button>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  ['Oct', '08', 'Robert Harrison', '09:30 AM - 10:15 AM', 'Confirmed'],
                  ['Oct', '09', 'Sarah Miller', '11:00 AM - 11:30 AM', 'Pending'],
                  ['Oct', '12', 'David Chen', '02:45 PM - 03:15 PM', 'Follow-up'],
                ].map(([mon, day, name, time, status]) => (
                  <div key={name} className="p-5 hover:bg-[#eff6ea] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-50 text-blue-600 w-12 h-12 rounded-lg flex flex-col items-center justify-center font-bold">
                        <span className="text-[10px] uppercase">{mon}</span>
                        <span className="text-lg leading-none">{day}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{name}</p>
                        <p className="text-sm text-[#3e4a3d]">{time}</p>
                      </div>
                      <span className="bg-green-100 text-green-700 text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}

export default CalendarPage
