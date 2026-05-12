import { NavLink } from 'react-router-dom'

import BackButton from './BackButton'

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
  /** Render heading/subtitle block above tabs. */
  showHeading?: boolean
  /** Render an inline back button to the left of the "Settings" heading. */
  backTo?: string
}

export default function SettingsHeadingNav({ variant = 'narrow', showTabs = true, showHeading = true, backTo }: Props) {
  const width = variant === 'wide' ? 'max-w-7xl' : 'max-w-6xl'
  const headingGrid = backTo ? 'grid-cols-[auto_minmax(0,1fr)]' : 'grid-cols-1'
  const textCol = backTo ? 'col-start-2' : 'col-start-1'

  return (
    <div className={`${width} mx-auto`}>
      {showHeading ? (
        <div className={showTabs ? 'mb-6' : ''}>
          <div className={`grid ${headingGrid} items-center gap-x-2 gap-y-2`}>
            {backTo ? <BackButton className="-ml-2 row-start-1" to={backTo} /> : null}
            <h2
              className={`row-start-1 min-w-0 text-[28px] font-bold leading-[1.2] tracking-tight text-[#171d16] ${textCol}`}
            >
              Settings
            </h2>
            <p className={`row-start-2 text-gray-500 ${textCol}`}>
              Manage your clinical profile, organization data, and medical team.
            </p>
          </div>
        </div>
      ) : null}

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
