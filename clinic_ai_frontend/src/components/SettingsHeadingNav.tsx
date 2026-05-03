import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/settings/edit-profile', label: 'Profile' },
  { to: '/settings/organization', label: 'Organization' },
  { to: '/settings/team-members', label: 'Team Members' },
] as const

type Props = {
  /** Widen heading row to align with `/settings` hero (max-w-7xl). Default matches detail pages (max-w-6xl). */
  variant?: 'wide' | 'narrow'
  /** Pill tabs (Profile / Organization / Team). Hide on `/settings` until user opens Edit Profile. */
  showTabs?: boolean
}

export default function SettingsHeadingNav({ variant = 'narrow', showTabs = true }: Props) {
  const width = variant === 'wide' ? 'max-w-7xl' : 'max-w-6xl'

  return (
    <div className={`${width} mx-auto`}>
      <div className={showTabs ? 'mb-6' : ''}>
        <h2 className="mb-2 text-[28px] font-bold tracking-tight text-[#171d16]">Settings</h2>
        <p className="text-gray-500">Manage your clinical profile, organization data, and medical team.</p>
      </div>

      {showTabs ? (
        <nav aria-label="Settings sections" className="mb-8 flex w-fit gap-2 rounded-full bg-[#e9f0e5] p-1">
          {tabs.map((t) => (
            <NavLink
              className={({ isActive }) =>
                [
                  'rounded-full px-6 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white text-[#2563eb] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900',
                ].join(' ')
              }
              end
              key={t.to}
              to={t.to}
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      ) : null}
    </div>
  )
}
