import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { clearAuthSession, getStoredAuthProfile } from '../lib/authSession'
import { doctorNameLabel } from '../lib/doctorDisplayName'
import { fetchMyProfile } from '../services/profileApi'

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
  const seed = getStoredAuthProfile()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const n = navState(pathname)
  const [sidebarName, setSidebarName] = useState<string>(
    doctorNameLabel(seed.fullName || seed.username || ''),
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const me = await fetchMyProfile()
        if (cancelled) return
        const raw = me.full_name?.trim() || me.username?.trim() || ''
        setSidebarName(doctorNameLabel(raw))
      } catch {
        if (!cancelled) {
          const fallback = getStoredAuthProfile()
          setSidebarName(doctorNameLabel(fallback.fullName || fallback.username || ''))
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function handleLogout(): void {
    clearAuthSession()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-full w-[240px] flex-col border-r border-gray-800 bg-[#111827] pb-4 text-sm">
      <div className="shrink-0 px-6 pt-6">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#16a34a]">
            <span className="material-symbols-outlined text-xl text-white">medical_services</span>
          </div>
          <div>
            <h1 className="text-xl font-bold leading-none text-white">MedGenie</h1>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Provider</p>
          </div>
        </div>
      </div>
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2">
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

      <div className="shrink-0 border-t border-gray-700 px-4 pt-4">
        <div className="rounded-xl bg-gray-800/90 px-3 py-3">
          <p className="truncate text-[13px] font-semibold leading-snug text-white" title={sidebarName || undefined}>
            {sidebarName || '—'}
          </p>
          <button
            className="mt-3 flex w-full items-center gap-2 rounded-lg py-1.5 text-left text-[13px] font-medium text-slate-400 transition-colors hover:bg-gray-700/80 hover:text-white"
            onClick={handleLogout}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Logout
          </button>
        </div>
      </div>
    </aside>
  )
}
