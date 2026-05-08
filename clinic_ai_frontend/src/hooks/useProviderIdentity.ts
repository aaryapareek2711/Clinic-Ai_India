import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { getStoredAuthProfile } from '../lib/authSession'
import { doctorNameLabel } from '../lib/doctorDisplayName'
import { fetchMyProfile, PROVIDER_PROFILE_UPDATED_EVENT } from '../services/profileApi'

const DEFAULT_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDaAYeQ0A8oF3vIfyLdOprOJ5SFTNVVvmJSbHXZgI1_hK5qpkoXqwV_MO6PstghTFvZxhRr4w_9UWJvAuxv6BAaL2Ki9iaopyTFj53ErGUzDUt0DPmIeEPkQ8QLnp9zdKrG7mSUR7QCKypwjDYeVy0wWE4WvCPcfkiJCCHGOCDYuuQZDw9ZSoHuRR0Y5GdkcuGswFoLmCDphSSFTzmWLMexlxM302h34UI87UnGQ_WgZ6-lEVzJP2xIG0bNin24u6kGXLX5-NY36vdO'

export function useProviderIdentity() {
  const { pathname } = useLocation()
  const seed = getStoredAuthProfile()
  const [nameRaw, setNameRaw] = useState<string>(seed.fullName || seed.username || '')
  const [title, setTitle] = useState<string>(seed.jobTitle || seed.role.replace(/_/g, ' ') || 'Clinical provider')
  const [avatarUrl, setAvatarUrl] = useState<string>(DEFAULT_AVATAR)

  const refreshFromServer = useCallback(async () => {
    try {
      const me = await fetchMyProfile()
      setNameRaw(me.full_name?.trim() || me.username?.trim() || '')
      setTitle(me.job_title?.trim() || me.role?.replace(/_/g, ' ') || 'Clinical provider')
      setAvatarUrl(me.avatar_url?.trim() ? me.avatar_url.trim() : DEFAULT_AVATAR)
    } catch {
      /* keep last known values */
    }
  }, [])

  useEffect(() => {
    void refreshFromServer()
  }, [pathname, refreshFromServer])

  useEffect(() => {
    const onProfileUpdated = () => void refreshFromServer()
    window.addEventListener(PROVIDER_PROFILE_UPDATED_EVENT, onProfileUpdated)
    return () => window.removeEventListener(PROVIDER_PROFILE_UPDATED_EVENT, onProfileUpdated)
  }, [refreshFromServer])

  const displayName = useMemo(() => doctorNameLabel(nameRaw) || 'Dr.', [nameRaw])
  return { displayName, title, avatarUrl }
}

