import { Outlet } from 'react-router-dom'

import ProviderSidebar from '../components/ProviderSidebar'

export default function ProviderLayout() {
  return (
    <div className="min-h-screen bg-[#f4fcf0] text-[#171d16]">
      <ProviderSidebar />
      <div className="min-h-screen pl-[240px]">
        <Outlet />
      </div>
    </div>
  )
}
