import { Navigate, Outlet, useLocation } from 'react-router-dom'

import ProviderSidebar from '../components/ProviderSidebar'
import { hasAuthToken } from '../lib/authSession'

export default function ProviderLayout() {
  const location = useLocation()
  if (!hasAuthToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return (
    <div className="min-h-screen bg-[#f4fcf0] text-[#171d16]">
      <ProviderSidebar />
      <div className="min-h-screen pl-[240px]">
        <Outlet />
      </div>
    </div>
  )
}
