import { Link, useLocation } from 'react-router-dom'

const ACTIVE =
  'bg-[#2563eb] text-white rounded-lg mx-2 flex items-center px-4 py-2 border-l-4 border-white w-[calc(100%-1rem)]'
const IDLE = 'text-gray-400 hover:text-white flex items-center px-4 py-2 hover:bg-gray-800 w-full'

function navState(pathname: string) {
  return {
    dashboard: pathname === '/dashboard',
    patients: pathname.startsWith('/patients'),
    calendar: pathname === '/calendar' || pathname === '/new-appointment',
    careprep: pathname.startsWith('/careprep'),
    visits: pathname.startsWith('/visits') || pathname === '/new-visit',
    templates: pathname.startsWith('/templates'),
    settings: pathname.startsWith('/settings'),
  }
}

export default function ProviderSidebar() {
  const { pathname } = useLocation()
  const n = navState(pathname)

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-full w-[240px] flex-col border-r border-gray-800 bg-[#111827] py-6 text-sm">
      <div className="mb-8 flex items-center gap-3 px-6">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#16a34a]">
          <span className="material-symbols-outlined text-xl text-white">medical_services</span>
        </div>
        <div>
          <h1 className="text-xl font-bold leading-none text-white">MedGenie</h1>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Provider</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col space-y-1">
        <Link className={n.dashboard ? ACTIVE : IDLE} to="/dashboard">
          <span className="material-symbols-outlined mr-3">dashboard</span>
          Dashboard
        </Link>
        <Link className={n.patients ? ACTIVE : IDLE} to="/patients">
          <span className="material-symbols-outlined mr-3">group</span>
          Patients
        </Link>
        <Link className={n.calendar ? ACTIVE : IDLE} to="/calendar">
          <span className="material-symbols-outlined mr-3">calendar_today</span>
          Calendar
        </Link>
        <Link className={n.careprep ? ACTIVE : IDLE} to="/careprep">
          <span className="material-symbols-outlined mr-3">assignment_turned_in</span>
          Care Prep
        </Link>
        <Link className={n.visits ? ACTIVE : IDLE} to="/visits">
          <span className="material-symbols-outlined mr-3">clinical_notes</span>
          Visit Management
        </Link>
        <Link className={n.templates ? ACTIVE : IDLE} to="/templates">
          <span className="material-symbols-outlined mr-3">description</span>
          Templates
        </Link>
        <Link className={n.settings ? ACTIVE : IDLE} to="/settings">
          <span className="material-symbols-outlined mr-3">settings</span>
          Settings
        </Link>
      </nav>
    </aside>
  )
}
