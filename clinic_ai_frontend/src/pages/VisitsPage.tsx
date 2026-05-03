import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

/** Replace with real IDs from your API; used to open visit management (pre-visit, etc.) */
const visitRows = [
  {
    visitId: 'demo-visit-001',
    name: 'Jonathan Miller - Follow-up Cardiology',
    meta: 'ID: #MG-8812 • Patient since 2021',
    status: 'In Progress',
    stage: 'Assessment Stage',
    date: 'Today, 10:30 AM',
    duration: 'Scheduled: 45 min',
    tone: 'blue',
  },
  {
    visitId: 'demo-visit-002',
    name: 'Sarah Jenkins - Routine Wellness Exam',
    meta: 'ID: #MG-9024 • New Patient',
    status: 'Scheduled',
    stage: 'Check-in Pending',
    date: 'Today, 2:15 PM',
    duration: 'Scheduled: 30 min',
    tone: 'amber',
  },
  {
    visitId: 'demo-visit-003',
    name: 'Michael Ross - Orthopedic Consultation',
    meta: 'ID: #MG-7731 • Post-Op Recovery',
    status: 'Completed',
    stage: 'Billing Finalized',
    date: 'Yesterday, 4:00 PM',
    duration: 'Duration: 55 min',
    tone: 'green',
  },
  {
    visitId: 'demo-visit-004',
    name: 'Elena Rodriguez - Diabetes Management',
    meta: 'ID: #MG-8142 • Chronic Care',
    status: 'In Progress',
    stage: 'Vitals Recorded',
    date: 'Today, 11:45 AM',
    duration: 'Scheduled: 20 min',
    tone: 'blue',
  },
] as const

type VisitTab = 'all' | 'scheduled' | 'in-progress' | 'completed'
type NotificationTone = 'green' | 'blue' | 'teal' | 'gray'

const notifications = [
  {
    title: 'OPD Note Generated',
    subtitle: 'Visit Note: Arthur Morgan',
    body: 'AI has completed the transcription for the 10:15 AM session. Please review and sign.',
    time: '12m ago',
    icon: 'clinical_notes',
    tone: 'green' as NotificationTone,
    unread: true,
    actions: ['Review Note', 'Discard'],
  },
  {
    title: 'Lab Results',
    subtitle: 'Lab Report: Sarah Connor',
    body: 'Comprehensive Metabolic Panel (CMP) results are now available for review.',
    time: '1h ago',
    icon: 'biotech',
    tone: 'blue' as NotificationTone,
    unread: true,
    actions: ['View Results'],
  },
  {
    title: 'WhatsApp Message',
    subtitle: 'John Marston (Patient)',
    body: '"Doctor, I am feeling much better today. Should I continue the current dosage for another week?"',
    time: '3h ago',
    icon: 'chat_bubble',
    tone: 'teal' as NotificationTone,
    unread: false,
    actions: ['Reply Now'],
  },
  {
    title: 'System Notice',
    subtitle: 'Maintenance Scheduled',
    body: 'MedGenie servers will undergo brief maintenance on Sunday, June 12, at 2:00 AM UTC.',
    time: 'Yesterday',
    icon: 'update',
    tone: 'gray' as NotificationTone,
    unread: false,
    actions: [],
  },
] as const

function notificationToneClasses(tone: NotificationTone) {
  if (tone === 'green') return 'bg-green-50 text-[#16a34a] border-green-100'
  if (tone === 'blue') return 'bg-blue-50 text-[#2563eb] border-blue-100'
  if (tone === 'teal') return 'bg-[#25d366]/10 text-[#128c7e] border-[#25d366]/20'
  return 'bg-gray-100 text-gray-500 border-gray-200'
}

function statusClasses(tone: string) {
  if (tone === 'amber') return 'bg-amber-100 text-[#f59e0b] border-amber-200'
  if (tone === 'green') return 'bg-green-100 text-[#22c55e] border-green-200'
  return 'bg-blue-100 text-[#3b82f6] border-blue-200'
}

function iconClasses(tone: string) {
  if (tone === 'amber') return 'bg-amber-50 text-amber-600'
  if (tone === 'green') return 'bg-green-50 text-green-600'
  return 'bg-blue-50 text-blue-600'
}

function VisitsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<VisitTab>('all')
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  const filteredRows = useMemo(() => {
    if (activeTab === 'scheduled') return visitRows.filter((row) => row.status === 'Scheduled')
    if (activeTab === 'in-progress') return visitRows.filter((row) => row.status === 'In Progress')
    if (activeTab === 'completed') return visitRows.filter((row) => row.status === 'Completed')
    return visitRows
  }, [activeTab])

  const tabTitles: Record<VisitTab, string> = {
    all: 'All Visits',
    scheduled: 'Scheduled Visits',
    'in-progress': 'In Progress Visits',
    completed: 'Completed Visits',
  }

  const tabDescriptions: Record<VisitTab, string> = {
    all: 'Manage patient visits and documentation',
    scheduled: 'Track upcoming appointments and ready check-ins',
    'in-progress': 'Monitor currently active consultations and stages',
    completed: 'Review closed visits and finalized documentation',
  }

  const tabStats: Record<VisitTab, { label: string; value: string; tone: string }[]> = {
    all: [
      { label: 'Total Visits', value: '1,284', tone: 'text-[#171d16]' },
      { label: 'Active Now', value: '18', tone: 'text-[#3b82f6]' },
      { label: 'Scheduled Today', value: '42', tone: 'text-[#f59e0b]' },
      { label: 'Completion Rate', value: '96.4%', tone: 'text-[#16a34a]' },
    ],
    scheduled: [
      { label: 'Scheduled Today', value: '42', tone: 'text-[#f59e0b]' },
      { label: 'Checked In', value: '11', tone: 'text-[#2563eb]' },
      { label: 'Upcoming (2h)', value: '8', tone: 'text-[#171d16]' },
      { label: 'No Shows', value: '2', tone: 'text-[#ef4444]' },
    ],
    'in-progress': [
      { label: 'Active Visits', value: '18', tone: 'text-[#3b82f6]' },
      { label: 'Avg Wait Time', value: '09m', tone: 'text-[#171d16]' },
      { label: 'In Assessment', value: '6', tone: 'text-[#f59e0b]' },
      { label: 'Pending Notes', value: '5', tone: 'text-[#ef4444]' },
    ],
    completed: [
      { label: 'Completed Today', value: '34', tone: 'text-[#16a34a]' },
      { label: 'Avg Duration', value: '37m', tone: 'text-[#171d16]' },
      { label: 'Billing Finalized', value: '29', tone: 'text-[#2563eb]' },
      { label: 'Follow-ups Needed', value: '7', tone: 'text-[#f59e0b]' },
    ],
  }

  return (
    <div className="bg-[#f4fcf0] text-[#171d16] min-h-screen">
      <aside className="w-[240px] fixed left-0 top-0 bg-[#111827] border-r border-gray-800 flex flex-col h-full py-6 text-sm">
        <div className="px-6 mb-8">
          <h1 className="text-xl font-bold text-white">MedGenie</h1>
          <p className="text-gray-400 text-xs">Provider</p>
        </div>
        <nav className="flex-1 space-y-1">
          <button className="text-gray-400 hover:text-white flex items-center px-4 py-2 hover:bg-gray-800 w-full" onClick={() => navigate('/dashboard')} type="button">
            <span className="material-symbols-outlined mr-3">dashboard</span>
            Dashboard
          </button>
          <button className="text-gray-400 hover:text-white flex items-center px-4 py-2 hover:bg-gray-800 w-full" onClick={() => navigate('/calendar')} type="button">
            <span className="material-symbols-outlined mr-3">calendar_today</span>
            Calendar
          </button>
          <button className="bg-[#2563eb] text-white rounded-lg mx-2 flex items-center px-4 py-2 border-l-4 border-white w-[calc(100%-1rem)]" type="button">
            <span className="material-symbols-outlined mr-3">clinical_notes</span>
            Visits
          </button>
          <button className="text-gray-400 hover:text-white flex items-center px-4 py-2 hover:bg-gray-800 w-full" onClick={() => navigate('/templates')} type="button">
            <span className="material-symbols-outlined mr-3">description</span>
            Templates
          </button>
          <button
            className="text-gray-400 hover:text-white flex items-center px-4 py-2 hover:bg-gray-800 w-full"
            onClick={() => navigate('/settings')}
            type="button"
          >
            <span className="material-symbols-outlined mr-3">settings</span>
            Settings
          </button>
        </nav>
      </aside>

      <main className="ml-[240px] min-h-screen">
        <header className="fixed top-0 right-0 w-[calc(100%-240px)] h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-10">
          <button className="flex items-center gap-2 text-gray-500 hover:opacity-80 transition-opacity" onClick={() => navigate('/dashboard')} type="button">
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="text-sm">Back to Dashboard</span>
          </button>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-gray-500 cursor-pointer">language</span>
              <button
                aria-label="Open notifications"
                className="relative text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors"
                onClick={() => setIsNotificationsOpen(true)}
                type="button"
              >
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              </button>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold">Dr. Profile</p>
                <p className="text-[10px] text-gray-500">Chief Surgeon</p>
              </div>
              <div className="w-10 h-10 rounded-full overflow-hidden bg-[#e9f0e5] border border-[#bdcaba]">
                <img
                  alt="Dr. Profile"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBbp_oWoE3bnBWCkxmGVQ6riaAyjs30B1Lo4Yhu5A5siihngE_nkAwxix-gGJYVdzU4cQw_1IauziH6vjCZxnBvpbUStMTrJMrXVoRW824lR8gZXHpXH9NuXgGmlvJsypd8lBwB6F__9FwTsvsiOXcWv9zKXjR19PCkpmgUymUSSC8YnRLjQDZAudIip-mTk3zjw6nyQRhuMUQJ2PNfv001VyWkBwe_k2WUxeTtt-2IPbA-mra85Nie88vfkwye-IGtIoKlqYm8HsEM"
                />
              </div>
            </div>
          </div>
        </header>

        <div className="pt-24 px-8 pb-12">
          <div className="mb-8">
            <h2 className="text-[28px] font-bold">{tabTitles[activeTab]}</h2>
            <p className="text-[#3e4a3d] mt-1">{tabDescriptions[activeTab]}</p>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex bg-[#eff6ea] p-1 rounded-xl w-full max-w-[620px] border border-[#bdcaba]">
              <button
                className={`flex-1 px-4 py-2 rounded-lg text-center text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'all' ? 'bg-[#2563eb] text-white' : 'text-gray-500 hover:text-[#171d16]'}`}
                onClick={() => setActiveTab('all')}
                type="button"
              >
                All Visits
              </button>
              <button
                className={`flex-1 px-4 py-2 rounded-lg text-center text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'scheduled' ? 'bg-[#2563eb] text-white' : 'text-gray-500 hover:text-[#171d16]'}`}
                onClick={() => setActiveTab('scheduled')}
                type="button"
              >
                Scheduled
              </button>
              <button
                className={`flex-1 px-4 py-2 rounded-lg text-center text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'in-progress' ? 'bg-[#2563eb] text-white' : 'text-gray-500 hover:text-[#171d16]'}`}
                onClick={() => setActiveTab('in-progress')}
                type="button"
              >
                In Progress
              </button>
              <button
                className={`flex-1 px-4 py-2 rounded-lg text-center text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'completed' ? 'bg-[#2563eb] text-white' : 'text-gray-500 hover:text-[#171d16]'}`}
                onClick={() => setActiveTab('completed')}
                type="button"
              >
                Completed
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {tabStats[activeTab].map((stat) => (
              <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-6">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{stat.label}</p>
                <h3 className={`text-2xl font-bold ${stat.tone}`}>{stat.value}</h3>
                <div className="mt-2 text-xs text-gray-500 flex items-center">
                  <span className="material-symbols-outlined text-sm">insights</span>
                  <span className="ml-1">Live operational signal</span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {filteredRows.map((row) => (
              <div
                key={row.visitId}
                className="group bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between hover:border-[#2563eb] transition-all cursor-pointer"
                onClick={() =>
                  navigate(
                    `/visits/detail?visitId=${encodeURIComponent(row.visitId)}&tab=pre-visit`,
                  )
                }
              >
                <div className="flex items-center gap-6 flex-1">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${iconClasses(row.tone)}`}>
                    <span className="material-symbols-outlined text-3xl">person</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">{row.name}</h4>
                    <p className="text-sm text-gray-500">{row.meta}</p>
                  </div>
                  <div className="hidden lg:flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusClasses(row.tone)}`}>{row.status}</span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">{row.stage}</span>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-sm font-medium">{row.date}</p>
                    <p className="text-xs text-gray-400">{row.duration}</p>
                  </div>
                  <span className="material-symbols-outlined text-gray-300 group-hover:text-[#2563eb] transition-colors">chevron_right</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </main>

      {isNotificationsOpen && (
        <>
          <button
            aria-label="Close notifications panel"
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setIsNotificationsOpen(false)}
            type="button"
          />
          <aside className="fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#2563eb]">notifications_active</span>
                <h2 className="text-lg font-bold text-[#171d16]">Notifications</h2>
              </div>
              <button
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
                onClick={() => setIsNotificationsOpen(false)}
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="px-2 pt-2 border-b border-gray-100 bg-gray-50/50">
              <div className="flex gap-1 overflow-x-auto">
                <button className="px-4 py-3 text-sm font-semibold border-b-2 border-[#2563eb] text-[#2563eb] whitespace-nowrap" type="button">
                  All <span className="ml-1 bg-[#2563eb] text-white text-[10px] px-1.5 py-0.5 rounded-full">{notifications.length}</span>
                </button>
                <button className="px-4 py-3 text-sm font-medium text-gray-500 whitespace-nowrap" type="button">Patients</button>
                <button className="px-4 py-3 text-sm font-medium text-gray-500 whitespace-nowrap" type="button">System</button>
                <button className="px-4 py-3 text-sm font-medium text-gray-500 whitespace-nowrap" type="button">WhatsApp</button>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto bg-white">
              {notifications.map((item) => (
                <div key={`${item.title}-${item.time}`} className="p-4 border-b border-gray-50 hover:bg-gray-50/80 transition-colors relative">
                  {item.unread && <div className="absolute right-4 top-4 w-2 h-2 bg-[#2563eb] rounded-full" />}
                  <div className="flex gap-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg border flex items-center justify-center ${notificationToneClasses(item.tone)}`}>
                      <span className="material-symbols-outlined">{item.icon}</span>
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[13px] font-semibold uppercase text-gray-700">{item.title}</span>
                        <span className="text-[11px] text-gray-500 font-medium">{item.time}</span>
                      </div>
                      <p className="text-sm font-medium text-[#171d16] mb-1">{item.subtitle}</p>
                      <p className="text-xs text-gray-500 leading-relaxed mb-3">{item.body}</p>
                      {item.actions.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {item.actions.map((action, idx) => (
                            <button
                              className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${idx === 0 ? 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]' : 'border border-gray-200 text-[#171d16] hover:bg-gray-50'}`}
                              key={action}
                              type="button"
                            >
                              {action}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <button className="w-full py-2.5 text-sm font-semibold text-gray-600 hover:text-[#2563eb] flex items-center justify-center gap-2 transition-colors" type="button">
                <span className="material-symbols-outlined text-sm">done_all</span>
                Mark all as read
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}

export default VisitsPage
