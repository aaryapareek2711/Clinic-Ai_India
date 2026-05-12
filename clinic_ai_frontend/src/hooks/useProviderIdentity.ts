import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { getStoredAuthProfile } from '../lib/authSession'
import { doctorNameLabel } from '../lib/doctorDisplayName'
import { syncDoctorScheduleFromServer } from '../lib/doctorScheduleSettings'
import { fetchMyProfile, PROVIDER_PROFILE_UPDATED_EVENT } from '../services/profileApi'

export function useProviderIdentity() {
  const { pathname } = useLocation()
  const seed = getStoredAuthProfile()
  const [nameRaw, setNameRaw] = useState<string>(seed.fullName || seed.username || '')
  const [title, setTitle] = useState<string>(seed.jobTitle || seed.role.replace(/_/g, ' ') || 'Clinical provider')
  const [avatarUrl, setAvatarUrl] = useState<string>('')

  const applyStoredProfile = useCallback(() => {
    const s = getStoredAuthProfile()
    setNameRaw((s.fullName || s.username || '').trim())
    const roleLabel = (s.role || 'doctor').replace(/_/g, ' ')
    setTitle((s.jobTitle || roleLabel || 'Clinical provider').trim())
  }, [])

  const refreshFromServer = useCallback(async () => {
    try {
      const me = await fetchMyProfile()
      setNameRaw(me.full_name?.trim() || me.username?.trim() || '')
      setTitle(me.job_title?.trim() || me.role?.replace(/_/g, ' ') || 'Clinical provider')
      setAvatarUrl(me.avatar_url?.trim() ? me.avatar_url.trim() : '')
      syncDoctorScheduleFromServer(me)
    } catch {
      applyStoredProfile()
    }
  }, [applyStoredProfile])

  useEffect(() => {
    void refreshFromServer()
  }, [pathname, refreshFromServer])

  useEffect(() => {
    const onProfileUpdated = () => {
      applyStoredProfile()
      void refreshFromServer()
    }
    window.addEventListener(PROVIDER_PROFILE_UPDATED_EVENT, onProfileUpdated)
    return () => window.removeEventListener(PROVIDER_PROFILE_UPDATED_EVENT, onProfileUpdated)
  }, [applyStoredProfile, refreshFromServer])

  const displayName = useMemo(() => doctorNameLabel(nameRaw) || 'Dr.', [nameRaw])
  return { displayName, title, avatarUrl }
}

