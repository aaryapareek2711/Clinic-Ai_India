import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NotificationsDrawer from './NotificationsDrawer'

const patients = [
  {
    name: 'Eleanor Shellstrop',
    language: 'English',
    languageTone: 'bg-blue-100/50 text-blue-700',
    id: '#MG-88219',
    genderIcon: 'female',
    genderAge: 'Female, 34 yrs',
    mobile: '+1 (555) 012-3456',
    visitDate: 'Oct 24, 2023',
    visitType: 'Regular Checkup',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBy12rZ1z7l9V7WPipKi21ponEKIJv6DCZCXZ_Dz7v8FDiGcMrv6BPX-T5m0qGZUnWQ767_jGD5XE6q5h_uZNkMfHmZOkleTC8nuVpFQZ1z1nkMQ76eFS_EW47Ihxr-OWGKNJAZXy9m4b5lyLS7snO3be7d--oRiu-b0fImzoX2LinCn5ZdL2ZIEPB56Z13rQRm_txcB6ZaOVK5qN37MmdHWqN3ZZRq5iY87jbW8mBjmrAhXcPNAV4K2XWZawykNHYSKKvsvAi70mqu',
  },
  {
    name: 'Chidi Anagonye',
    language: 'French',
    languageTone: 'bg-amber-100/50 text-amber-700',
    id: '#MG-88402',
    genderIcon: 'male',
    genderAge: 'Male, 29 yrs',
    mobile: '+1 (555) 987-6543',
    visitDate: 'Oct 21, 2023',
    visitType: 'Lab Results',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCddbhh-mHJ_UCxNegyN3VmvyNUsUlaZb92SAFSjOF8GUOifVS_cqWglC0E8GU-h3WH-XqAW6oHRGn6_N1nMhldoFmqr6-iqXcnHJDk_uBzDOSXLzwj1M77pgDXhA0JTIgF_EbEqKvaRY4nQcFJWs3zAPNSBZ8NRcoUM3bBjJZCCRoWmdusKRE9v4yiArMu8oiWszKAE9jI3t3XqCiAOJaYqRyMAJcopPIp_6rvprew8yyIEzCZrnM4Xse_Md3mJKmtuqMrR8t1KweU',
  },
  {
    name: 'Tahani Al-Jamil',
    language: 'English',
    languageTone: 'bg-blue-100/50 text-blue-700',
    id: '#MG-89110',
    genderIcon: 'female',
    genderAge: 'Female, 62 yrs',
    mobile: '+1 (555) 234-5678',
    visitDate: 'Oct 19, 2023',
    visitType: 'Consultation',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDRriItpcXQbHBYVl4K2IyN-dC9MPuUdDuUshuCvZ6bhFVv-tlTXs-EPIO3j9mRssoIimFhkD3n1uN1X5bouImfoS-L5xafnPSbKEvK5i7MRqTpLt1x2QOG91Yhsth53oKEQkE0yzIsFTQfvj3TwkuhuXohS7A5eBw_GrBoBcH_adueVKNXa8J60jmesPS5BagZanToho5FnTSnCeCWERQ5yawFqVFiyLzuhda5KOFawJGUqMG4661M27mrpIXV-onINoKPl79WOHf1',
  },
  {
    name: 'Jason Mendoza',
    language: 'Spanish',
    languageTone: 'bg-emerald-100/50 text-emerald-700',
    id: '#MG-90032',
    genderIcon: 'male',
    genderAge: 'Male, 27 yrs',
    mobile: '+1 (555) 345-6789',
    visitDate: 'Oct 15, 2023',
    visitType: 'Emergency Care',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDzLdhnNVVfkeW0tRBMh2N5MUNOwtmZGBruWEAExb7xqO2TdED5j4mBaO3vHjIOzC2-_Bu246DkMEkeBGJ5DpH996f7oSpVxnDXk5ZI2qZquKYfb3S2BOMAybHUmfZ82g9ZuFR6T3YZ07hbWn08LTPyM3HzlRHbaU1Vz0h4sjHB47mTvTqNJfX-bVA604grFo109l-OVdYffd50IdToDAYegPjICNTdUF2QC0TA_mL_Wj9IxBYQB5INGx1xbXGzuXk8ztuDRSa96aWC',
  },
]

function PatientsPage() {
  const navigate = useNavigate()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  return (
    <div className="bg-[#f4fcf0] text-[#171d16] min-h-screen font-manrope">
      <aside className="h-screen w-64 fixed left-0 top-0 flex flex-col border-r border-gray-800 bg-[#111827] text-sm z-50">
        <div className="flex flex-col h-full py-6">
          <div className="px-6 mb-8 flex items-center gap-3">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-white">medical_services</span>
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white">MedGenie</h1>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Clinical Portal</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-3">
            <button
              className="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors rounded-lg"
              onClick={() => navigate('/dashboard')}
              type="button"
            >
              <span className="material-symbols-outlined">dashboard</span>
              <span>Dashboard</span>
            </button>
            <button
              className="w-full flex items-center gap-3 px-3 py-2 bg-[#2563eb] text-white font-semibold border-l-4 border-white transition-all rounded-lg"
              type="button"
            >
              <span className="material-symbols-outlined">group</span>
              <span>Patients</span>
            </button>
            <button
              className="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors rounded-lg"
              onClick={() => navigate('/visits')}
              type="button"
            >
              <span className="material-symbols-outlined">medical_services</span>
              <span>Visits</span>
            </button>
            <button
              className="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors rounded-lg"
              onClick={() => navigate('/calendar')}
              type="button"
            >
              <span className="material-symbols-outlined">calendar_today</span>
              <span>Schedule</span>
            </button>
            <button
              className="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors rounded-lg"
              onClick={() => navigate('/settings')}
              type="button"
            >
              <span className="material-symbols-outlined">settings</span>
              <span>Settings</span>
            </button>
          </nav>

          <div className="px-3 mt-auto">
            <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
              <img
                alt="Provider Profile"
                className="w-10 h-10 rounded-full object-cover border-2 border-white"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCuVbujRH0BJpNqXXEGoIqLWBwk-QJENPn0t_9TEVyS7Wa35NpK2uRWmQgZec2kdDbLyhjBclbjULHEHsh3Kgvbdt_AQmTTUgwxeOTIwaeHx_m1cs83Hjca_wiIo8_AkPLf1PjEORU2U4AkSt1gF6WM2Mk2TbmOsxKRPFC2YC9Zmw3a34n2MKtn4Qo93PSASoVZeyMwwWKnb74KDkEQRhWf-aiUVoB6ZDBSX6uZ1jvPqYcCjMjKWoLy03cSlOEBGUSQuMNVCH214sSy"
              />
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">Dr. James Wilson</p>
                <p className="text-[10px] text-teal-400 font-medium">Senior Physician</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <header className="h-16 sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-md flex items-center justify-between px-8 ml-64">
        <div className="flex items-center gap-6 w-1/2">
          <div className="relative w-full max-w-md group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-600 transition-colors">search</span>
            <input
              className="w-full bg-slate-50 border border-gray-200 rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none"
              placeholder="Search patients, files, or records..."
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-6 w-px bg-gray-200 mx-2" />
          <button className="hover:bg-slate-100 rounded-full p-2 transition-all relative" onClick={() => setIsNotificationsOpen(true)} type="button">
            <span className="material-symbols-outlined text-slate-600">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>
        </div>
      </header>

      <main className="ml-64 p-8 min-h-[calc(100vh-4rem)]">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <nav className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-2">
              <span>Clinical Portal</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-teal-600">Patient Directory</span>
            </nav>
            <h2 className="text-[28px] leading-tight tracking-[-0.02em] font-bold text-[#171d16]">Patient Directory</h2>
            <p className="text-slate-500 mt-1">Manage and monitor 1,248 registered medical profiles.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all" type="button">
              <span className="material-symbols-outlined text-[18px]">sort</span>
              Sort by: Latest
              <span className="material-symbols-outlined text-[18px]">expand_more</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#bdcaba] overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-[#bdcaba]">
                <th className="px-6 py-4 text-[13px] tracking-[0.05em] font-medium text-[#3e4a3d] uppercase">Patient Name</th>
                <th className="px-6 py-4 text-[13px] tracking-[0.05em] font-medium text-[#3e4a3d] uppercase">Patient ID</th>
                <th className="px-6 py-4 text-[13px] tracking-[0.05em] font-medium text-[#3e4a3d] uppercase">Gender / Age</th>
                <th className="px-6 py-4 text-[13px] tracking-[0.05em] font-medium text-[#3e4a3d] uppercase">Mobile Number</th>
                <th className="px-6 py-4 text-[13px] tracking-[0.05em] font-medium text-[#3e4a3d] uppercase">Last Visit Date</th>
                <th className="px-6 py-4 text-[13px] tracking-[0.05em] font-medium text-[#3e4a3d] uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#bdcaba]">
              {patients.map((patient) => (
                <tr
                  key={patient.id}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  onClick={() => navigate('/patients/detail')}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img alt={patient.name} className="w-10 h-10 rounded-full object-cover border border-slate-100" src={patient.image} />
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors">{patient.name}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${patient.languageTone}`}>{patient.language}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-slate-500">{patient.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-slate-400">{patient.genderIcon}</span>
                      <span className="text-sm text-slate-700">{patient.genderAge}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600">{patient.mobile}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-700">{patient.visitDate}</span>
                      <span className="text-[11px] text-slate-400">{patient.visitType}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      className="text-slate-400 hover:text-teal-600 transition-colors"
                      onClick={(event) => {
                        event.stopPropagation()
                        navigate('/patients/detail')
                      }}
                      type="button"
                    >
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-6 py-4 bg-slate-50/50 flex items-center justify-between border-t border-[#bdcaba]">
            <span className="text-sm text-slate-500 font-medium">Showing 1 to 10 of 1,248 patients</span>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg border border-slate-200 text-slate-400 opacity-50" disabled type="button">
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button className="w-8 h-8 rounded-lg bg-teal-600 text-white font-bold text-sm" type="button">1</button>
              <button className="w-8 h-8 rounded-lg text-slate-600 font-medium text-sm hover:bg-white border border-transparent hover:border-slate-200 transition-all" type="button">2</button>
              <button className="w-8 h-8 rounded-lg text-slate-600 font-medium text-sm hover:bg-white border border-transparent hover:border-slate-200 transition-all" type="button">3</button>
              <span className="text-slate-400 px-1">...</span>
              <button className="w-8 h-8 rounded-lg text-slate-600 font-medium text-sm hover:bg-white border border-transparent hover:border-slate-200 transition-all" type="button">125</button>
              <button className="p-2 rounded-lg border border-slate-200 hover:bg-white text-slate-600 transition-all" type="button">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

      </main>

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}

export default PatientsPage
