import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NotificationsDrawer from './NotificationsDrawer'

function escapeCsvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function downloadAppointmentsTemplateCsv(): void {
  const header = ['patient_name', 'appointment_date', 'start_time', 'end_time', 'visit_type', 'status', 'notes']
  const row = ['Jane Doe', '2024-10-15', '09:00', '09:30', 'Follow-up', 'Confirmed', 'Example row — replace with real data']
  const csvLines = [
    header.map(escapeCsvCell).join(','),
    row.map(escapeCsvCell).join(','),
  ]
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'medgenie-appointments-import-template.csv'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function CalendarPage() {
  const navigate = useNavigate()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isImportCsvOpen, setIsImportCsvOpen] = useState(false)
  const importCsvRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isImportCsvOpen) return
    function handlePointerDown(ev: MouseEvent) {
      if (importCsvRef.current && !importCsvRef.current.contains(ev.target as Node)) {
        setIsImportCsvOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isImportCsvOpen])

  return (
    <div className="font-inter text-[#171d16] min-h-screen">
      <header className="fixed top-0 right-0 w-[calc(100%-240px)] h-16 bg-white border-b border-gray-200 flex items-center justify-end px-8 z-40">
        <div className="flex items-center gap-6">
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

      <main className="pt-16 min-h-screen p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-[28px] font-bold">Calendar</h2>
            <p className="text-[#3e4a3d]">Manage your appointments and schedule</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="relative" ref={importCsvRef}>
              <button
                className={`flex items-center gap-2 rounded-lg px-5 py-2.5 font-medium text-white ${isImportCsvOpen ? 'bg-[#1e293b]' : 'bg-[#111827] hover:bg-[#1e293b]'}`}
                onClick={() => setIsImportCsvOpen((o) => !o)}
                type="button"
              >
                <span className="material-symbols-outlined text-[1.125rem]">upload_file</span>
                Import CSV
                <span className="material-symbols-outlined text-[1.125rem]">{isImportCsvOpen ? 'expand_less' : 'expand_more'}</span>
              </button>
              {isImportCsvOpen ? (
                <div
                  className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[min(100vw-2rem,20rem)] rounded-xl border border-gray-200 bg-white p-4 shadow-lg sm:left-auto sm:right-0"
                  role="dialog"
                  aria-label="Import CSV options"
                >
                  <p className="mb-3 text-sm text-[#3e4a3d]">
                    Download a template CSV with the expected columns, then fill it in for bulk import later.
                  </p>
                  <button
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#111827] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e293b]"
                    onClick={() => {
                      downloadAppointmentsTemplateCsv()
                      setIsImportCsvOpen(false)
                    }}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[1.125rem]">download</span>
                    Download CSV template
                  </button>
                </div>
              ) : null}
            </div>
            <button
              className="flex items-center gap-2 rounded-lg bg-[#16a34a] px-5 py-2.5 font-medium text-white"
              onClick={() => navigate('/new-appointment')}
              type="button"
            >
              New Appointment
            </button>
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
