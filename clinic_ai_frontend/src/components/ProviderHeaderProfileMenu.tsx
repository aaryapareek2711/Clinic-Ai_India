import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import ProviderAvatar from './ProviderAvatar'
import { clearAuthSession, getStoredAuthProfile } from '../lib/authSession'
import { doctorNameLabel } from '../lib/doctorDisplayName'
import { useProviderIdentity } from '../hooks/useProviderIdentity'

type Props = {
  /** Extra classes on the root wrapper (e.g. shrink-0). */
  className?: string
}

export default function ProviderHeaderProfileMenu({ className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const seed = getStoredAuthProfile()
  const provider = useProviderIdentity()
  const displayName = useMemo(() => {
    const storedDisplay = doctorNameLabel(seed.fullName) || seed.username.trim()
    return storedDisplay || provider.displayName
  }, [seed.fullName, seed.username, provider.displayName])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function handleLogout(): void {
    clearAuthSession()
    navigate('/login', { replace: true })
  }

  return (
    <div className={`relative ${className}`.trim()} ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex max-w-full items-center gap-2 rounded-lg py-1.5 pl-2 pr-1 text-left transition-colors hover:bg-gray-50"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <div className="min-w-0 text-right">
          <p className="truncate text-sm font-semibold text-[#171d16]" title={displayName || undefined}>
            {displayName || '—'}
          </p>
          <p className="truncate text-[11px] text-gray-500">{provider.title || 'Clinical provider'}</p>
        </div>
        <ProviderAvatar
          className="shrink-0 border border-gray-200"
          imageUrl={provider.avatarUrl}
          label={displayName}
          size="md"
        />
        <span
          className={`material-symbols-outlined shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-[60] mt-1 min-w-[200px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          role="menu"
        >
          <Link
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#171d16] hover:bg-gray-50"
            onClick={() => setOpen(false)}
            role="menuitem"
            to="/settings"
          >
            <span className="material-symbols-outlined text-[20px] text-gray-500">settings</span>
            Settings
          </Link>
          <button
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-[#171d16] hover:bg-gray-50"
            onClick={() => {
              setOpen(false)
              handleLogout()
            }}
            role="menuitem"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px] text-gray-500">logout</span>
            Log out
          </button>
        </div>
      )}
    </div>
  )
}
