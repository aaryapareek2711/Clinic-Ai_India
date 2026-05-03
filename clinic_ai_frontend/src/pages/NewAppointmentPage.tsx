import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NotificationsDrawer from './NotificationsDrawer'

function NewAppointmentPage() {
  const navigate = useNavigate()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  return (
    <div className="bg-[#f4fcf0] text-[#171d16] antialiased overflow-hidden h-screen">
      <aside className="w-[240px] h-full fixed left-0 top-0 bg-[#111827] border-r border-gray-800 flex flex-col py-6 z-50">
        <div className="px-6 mb-10 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#16a34a] rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-white">medical_services</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white leading-none">MedGenie</h1>
            <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-1">Provider</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          <button className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center px-4 py-2 hover:bg-gray-800 w-full" onClick={() => navigate('/dashboard')} type="button">
            <span className="material-symbols-outlined mr-3">dashboard</span>
            Dashboard
          </button>
          <button className="bg-[#2563eb] text-white rounded-lg mx-2 flex items-center px-4 py-2 border-l-4 border-white scale-[0.98] transition-all w-[calc(100%-1rem)]" onClick={() => navigate('/calendar')} type="button">
            <span className="material-symbols-outlined mr-3">calendar_today</span>
            Calendar
          </button>
          <button className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center px-4 py-2 hover:bg-gray-800 w-full" onClick={() => navigate('/visits')} type="button">
            <span className="material-symbols-outlined mr-3">clinical_notes</span>
            Visits
          </button>
          <button className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center px-4 py-2 hover:bg-gray-800 w-full" onClick={() => navigate('/templates')} type="button">
            <span className="material-symbols-outlined mr-3">description</span>
            Templates
          </button>
          <button className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center px-4 py-2 hover:bg-gray-800 w-full" onClick={() => navigate('/settings')} type="button">
            <span className="material-symbols-outlined mr-3">settings</span>
            Settings
          </button>
        </nav>
        <div className="mt-8 pt-6 border-t border-gray-800">
          <button className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center px-4 py-2 hover:bg-gray-800 w-full" onClick={() => navigate('/login')} type="button">
            <span className="material-symbols-outlined mr-3">logout</span>
            Logout
          </button>
        </div>
      </aside>

      <header className="fixed top-0 right-0 w-[calc(100%-240px)] h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-40">
        <div className="flex items-center gap-4">
          <button className="p-2 text-gray-500 hover:bg-gray-50 rounded-full transition-all" onClick={() => navigate('/calendar')} type="button">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-[28px] leading-[1.2] tracking-[-0.02em] font-bold">New Appointment</h2>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex gap-4">
            <button className="p-2 text-gray-500 hover:bg-gray-50 rounded-full transition-opacity" type="button">
              <span className="material-symbols-outlined">language</span>
            </button>
            <button className="p-2 text-gray-500 hover:bg-gray-50 rounded-full transition-opacity relative" onClick={() => setIsNotificationsOpen(true)} type="button">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#ba1a1a] rounded-full" />
            </button>
          </div>
          <div className="h-8 w-px bg-gray-200" />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-[#171d16]">Dr. Sarah Jenkins</p>
              <p className="text-[11px] text-[#3e4a3d] font-medium">Chief Surgeon</p>
            </div>
            <img
              alt="Dr. Profile"
              className="w-10 h-10 rounded-full object-cover border border-gray-200"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD6xmsE3EC7DLfeHgD9_yb6j4nDZeOYyxC9a9D8cudFDHjCJG9vzUQu73mzDSPdkOg0TdsvlFwz43PNNx80LLxdoQjDsjNxO0XygLetthxbx5fQCBQNOcmnEDgQWhI5F1A51OmRisdoJ-BHkx13uXKEarhQWh9pA5_in2G2p-QsGw7qq4U07k_s7l_bGWYDXt_YMJuw4Ce0BVPGznVkDI931xGJUh6hLP9m-e0GA12V1lMpQ6lPczve9qVi9IA5agFDwMtKAThDMd9m"
            />
          </div>
        </div>
      </header>

      <main className="ml-[240px] pt-16 h-screen overflow-hidden flex">
        <section className="w-1/2 border-r border-gray-200 flex flex-col p-8 overflow-hidden bg-white">
          <div className="mb-6">
            <h3 className="text-[18px] leading-[1.4] font-semibold text-[#171d16] mb-2">Select Existing Patient</h3>
            <p className="text-[#3e4a3d]">Find the patient to schedule their next consultation.</p>
          </div>
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2563eb] focus:border-transparent outline-none transition-all" placeholder="Search by name or mobile number" type="text" />
            </div>
            <div className="relative">
              <select className="pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2563eb] focus:border-transparent outline-none appearance-none transition-all font-medium min-w-[120px]" defaultValue="latest">
                <option value="latest">Latest</option>
                <option value="oldest">Oldest</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#3e4a3d] text-xl">expand_more</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            <div className="p-4 rounded-xl border-2 border-[#2563eb] bg-[#2563eb]/5 flex items-center gap-4 cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-[#2563eb] flex items-center justify-center text-white font-bold text-lg">ED</div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold">Eleanor Donahue</h4>
                  <span className="text-[11px] px-2 py-0.5 bg-[#2563eb] text-white rounded-full uppercase tracking-wider font-bold">Selected</span>
                </div>
                <p className="text-xs text-[#3e4a3d] font-medium mt-1">ID: MG-98234-22</p>
                <p className="text-xs text-[#3e4a3d] mt-0.5">+1 (555) 012-3456</p>
              </div>
            </div>
            {[
              ['JM', 'James McAllister', 'MG-77341-21', '+1 (555) 987-6543'],
              ['LW', 'Lana White', 'MG-11209-23', '+1 (555) 234-5678'],
              ['TK', 'Thomas Kenedy', 'MG-55421-22', '+1 (555) 876-1234'],
            ].map(([initials, name, id, phone]) => (
              <div key={id} className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-all flex items-center gap-4 cursor-pointer bg-white group">
                <div className="w-12 h-12 rounded-full bg-[#dde5d9] flex items-center justify-center text-[#3e4a3d] font-bold text-lg group-hover:bg-[#00873a] group-hover:text-white transition-colors">{initials}</div>
                <div className="flex-1">
                  <h4 className="font-semibold">{name}</h4>
                  <p className="text-xs text-[#3e4a3d] font-medium mt-1">ID: {id}</p>
                  <p className="text-xs text-[#3e4a3d] mt-0.5">{phone}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="w-1/2 p-8 overflow-y-auto bg-[#eff6ea]/40">
          <div className="max-w-xl mx-auto space-y-8">
            <div>
              <h3 className="text-[18px] leading-[1.4] font-semibold text-[#171d16] mb-6">Appointment Booking</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-[13px] tracking-[0.05em] text-[#3e4a3d] uppercase mb-3">Select Date</label>
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-4 px-2">
                      <h4 className="font-bold">October 2024</h4>
                      <div className="flex gap-2">
                        <button className="p-1 text-[#3e4a3d] hover:bg-gray-100 rounded transition-colors" type="button"><span className="material-symbols-outlined">chevron_left</span></button>
                        <button className="p-1 text-[#3e4a3d] hover:bg-gray-100 rounded transition-colors" type="button"><span className="material-symbols-outlined">chevron_right</span></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 text-center gap-y-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="text-[10px] font-bold text-[#3e4a3d]/50 uppercase">{day}</div>
                      ))}
                      {['29', '30', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'].map((date) => (
                        <div key={date} className={`py-2 text-sm rounded-lg cursor-pointer ${date === '29' || date === '30' ? 'text-gray-300' : date === '12' ? 'font-bold bg-[#2563eb] text-white' : 'text-[#171d16] hover:bg-[#00873a]/10'}`}>
                          {date}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] tracking-[0.05em] text-[#3e4a3d] uppercase mb-3">Select Time</label>
                  <input
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2563eb] focus:border-transparent outline-none transition-all font-medium"
                    defaultValue="10:00"
                    step={300}
                    type="time"
                  />
                </div>

              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-gray-200">
              <button className="px-6 py-3 font-semibold text-[#3e4a3d] hover:text-[#171d16] transition-colors flex items-center gap-2" onClick={() => navigate('/calendar')} type="button">
                Cancel
              </button>
              <button className="px-8 py-3 bg-[#16a34a] hover:bg-[#00873a] text-white rounded-xl font-bold transition-all shadow-sm flex items-center gap-2" type="button">
                Confirm Appointment
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
