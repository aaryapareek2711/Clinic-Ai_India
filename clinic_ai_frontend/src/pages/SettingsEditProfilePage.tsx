import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NotificationsDrawer from './NotificationsDrawer'

function SettingsEditProfilePage() {
  const navigate = useNavigate()
  const showDigitalIntegrations = false
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  return (
    <div className="font-manrope text-[#171d16] bg-[#f4fcf0] min-h-screen">
      <aside className="w-[240px] h-full fixed left-0 top-0 bg-[#111827] border-r border-gray-800 flex flex-col py-6 antialiased">
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#16a34a] rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-lg">medical_services</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white leading-none">MedGenie</h1>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mt-1">Provider</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          <button className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center px-6 py-2 hover:bg-gray-800 w-full" onClick={() => navigate('/dashboard')} type="button">
            <span className="material-symbols-outlined mr-3">dashboard</span>
            Dashboard
          </button>
          <button className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center px-6 py-2 hover:bg-gray-800 w-full" onClick={() => navigate('/calendar')} type="button">
            <span className="material-symbols-outlined mr-3">calendar_today</span>
            Calendar
          </button>
          <button className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center px-6 py-2 hover:bg-gray-800 w-full" onClick={() => navigate('/visits')} type="button">
            <span className="material-symbols-outlined mr-3">clinical_notes</span>
            Visits
          </button>
          <button className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center px-6 py-2 hover:bg-gray-800 w-full" onClick={() => navigate('/templates')} type="button">
            <span className="material-symbols-outlined mr-3">description</span>
            Templates
          </button>
          <button className="bg-[#2563eb] text-white rounded-lg mx-2 flex items-center px-4 py-2 border-l-4 border-white w-[calc(100%-1rem)]" onClick={() => navigate('/settings')} type="button">
            <span className="material-symbols-outlined mr-3">settings</span>
            Settings
          </button>
        </nav>
        <div className="mt-auto px-6">
          <a className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center py-2" href="#">
            <span className="material-symbols-outlined mr-3">logout</span>
            Logout
          </a>
        </div>
      </aside>

      <header className="fixed top-0 right-0 w-[calc(100%-240px)] h-16 bg-white border-b border-gray-200 flex items-center justify-end px-8 z-10">
        <div className="flex items-center gap-6">
          <button className="text-gray-500 hover:opacity-80 transition-opacity" type="button">
            <span className="material-symbols-outlined">language</span>
          </button>
          <button className="text-gray-500 hover:opacity-80 transition-opacity relative" onClick={() => setIsNotificationsOpen(true)} type="button">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>
          <div className="flex items-center gap-3 border-l border-gray-200 pl-6">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">Dr. Rajesh Kumar</p>
              <p className="text-xs text-gray-500">Chief Surgeon</p>
            </div>
            <img
              alt="Dr. Profile"
              className="w-10 h-10 rounded-full border border-gray-200 object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC9qvBtwYtxaNFbrzzJeE1456CDBegoNbtFD_aLQsWroHthntZGH73OQw4K2IY7b5TZkTSYmvtR-6fnYNJVjgWiH-MsFpIHE4UYfRLxbRMdjLrNxmlUo51CCtxzHnvO_ul4JL5V6hM7E4Q9KF5metIClMUMc-RNiVXc7N8o3SDd6NYjxgoifDDg95XsNTHHceUIkJqjfUaq_PlQlpAOQP0cy1BmL398p5Uif5bWV5C70ZMkqIfCY4J4aOXm3RA5GdMjBT8ZizYVrk1v"
            />
          </div>
        </div>
      </header>

      <main className="ml-[240px] pt-16 min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h2 className="text-[28px] font-bold mb-2">Settings</h2>
            <p className="text-gray-500">Manage your clinical profile, organization data, and medical team.</p>
          </div>

          <div className="flex gap-2 mb-8 bg-[#e9f0e5] p-1 rounded-full w-fit">
            <button className="px-6 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors" onClick={() => navigate('/settings')} type="button">Profile</button>
            <button className="px-6 py-2 rounded-full text-sm font-medium bg-white text-[#2563eb] shadow-sm" type="button">Organization</button>
            <button className="px-6 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors" onClick={() => navigate('/settings/team-members')} type="button">Team Members</button>
          </div>

          <div className="grid grid-cols-12 gap-8">
            <section className="col-span-12 lg:col-span-8 bg-white border border-gray-200 rounded-xl p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-[18px] font-semibold">Clinic Profile</h3>
                  <p className="text-sm text-[#3e4a3d] mt-1">Manage your practice identification and location details.</p>
                </div>
                <span className="bg-[#22c55e]/10 text-[#22c55e] px-3 py-1 rounded-full text-xs font-semibold">Verified</span>
              </div>
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[13px] tracking-[0.05em] text-[#3e4a3d] uppercase">Practice Name</label>
                    <input className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent outline-none transition-all text-sm" defaultValue="City Health Multispeciality" type="text" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[13px] tracking-[0.05em] text-[#3e4a3d] uppercase">Practice Type</label>
                    <select className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent outline-none transition-all text-sm" defaultValue="Group Practice">
                      <option>Solo Practice</option>
                      <option>Group Practice</option>
                      <option>Hospital</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[13px] tracking-[0.05em] text-[#3e4a3d] uppercase">Street Address</label>
                  <input className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent outline-none transition-all text-sm" defaultValue="Suite 402, Medical Enclave, Sector 15" type="text" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[13px] tracking-[0.05em] text-[#3e4a3d] uppercase">City</label>
                    <input className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent outline-none transition-all text-sm" defaultValue="New Delhi" type="text" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[13px] tracking-[0.05em] text-[#3e4a3d] uppercase">State</label>
                    <input className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent outline-none transition-all text-sm" defaultValue="Delhi" type="text" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[13px] tracking-[0.05em] text-[#3e4a3d] uppercase">Pincode</label>
                    <input className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent outline-none transition-all text-sm" defaultValue="110016" type="text" />
                  </div>
                </div>
                <div className="pt-4 flex justify-end">
                  <button className="bg-[#16a34a] text-white px-8 py-2.5 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center" type="submit">
                    <span className="material-symbols-outlined mr-2 text-sm">save</span>
                    Save Changes
                  </button>
                </div>
              </form>
            </section>

            <aside className="col-span-12 lg:col-span-4 space-y-6">
              <div className="bg-[#006b2c] text-white p-6 rounded-xl overflow-hidden relative">
                <div className="relative z-10">
                  <h4 className="text-white/80 text-xs uppercase mb-2 tracking-wider">Organization Health</h4>
                  <p className="text-3xl font-bold mb-4">98.4%</p>
                  <p className="text-sm text-white/70 leading-relaxed">Your organization profile is nearly complete. Completing the ABDM integration will reach 100%.</p>
                </div>
                <div className="absolute -right-8 -bottom-8 opacity-20">
                  <span className="material-symbols-outlined text-[120px]">verified_user</span>
                </div>
              </div>
              <div className="rounded-xl overflow-hidden h-48 border border-gray-200">
                <img
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDSoC1esh9dQbtFMdDSl90kCZQLH5Ol71iTM54RLYUGH8av5BBbae9KHbLxMCpg0ZnJ0FkDKeihqpRbcbcfxlh_FlBOX1D5ks1omJVvjqfvhpC3XsLGZ8M-qIrZT511pngfk91ArPvmfmssHZpOUcZReOnCwwDLXvbxyw2ZM8kJFWDnKPHQqnplQGPUMQ0VcdKlHVHceCyGdn17VjG8yJRvpqT64y4lUQb24get9k6WZIwAzkP91PNOMrjqWx3Z8upRAryfrm_quXqa"
                  alt="Modern clinic"
                />
              </div>
            </aside>

            {showDigitalIntegrations && (
              <section className="col-span-12 bg-white border border-gray-200 rounded-xl p-8">
                <div className="mb-8">
                  <h3 className="text-[18px] font-semibold">Digital Integrations</h3>
                  <p className="text-sm text-[#3e4a3d] mt-1">Connect your clinic to national health systems and patient messaging platforms.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="flex items-start p-6 bg-[#e9f0e5] rounded-xl border border-transparent hover:border-[#16a34a] transition-all">
                    <div className="bg-white p-3 rounded-lg mr-4 shadow-sm">
                      <span className="material-symbols-outlined text-[#16a34a] text-3xl">chat</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold">WhatsApp Business</h4>
                        <span className="bg-[#3b82f6]/10 text-[#3b82f6] px-2 py-0.5 rounded text-[10px] font-bold uppercase">Setup Pending</span>
                      </div>
                      <p className="text-xs text-[#3e4a3d] mb-4">Automate appointment reminders and send prescriptions directly to patients via WhatsApp.</p>
                      <button className="bg-[#111827] text-white text-xs px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors" type="button">Configure API</button>
                    </div>
                  </div>
                  <div className="flex items-start p-6 bg-[#e9f0e5] rounded-xl border border-transparent hover:border-[#16a34a] transition-all">
                    <div className="bg-white p-3 rounded-lg mr-4 shadow-sm">
                      <span className="material-symbols-outlined text-[#16a34a] text-3xl">account_balance</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold">ABDM Facility ID</h4>
                        <span className="bg-[#f59e0b]/10 text-[#f59e0b] px-2 py-0.5 rounded text-[10px] font-bold uppercase">Action Required</span>
                      </div>
                      <p className="text-xs text-[#3e4a3d] mb-4">Link your Ayushman Bharat Digital Mission Facility ID to enable national health records sync.</p>
                      <div className="flex items-center space-x-2">
                        <input className="text-xs px-3 py-1.5 border border-gray-200 rounded bg-white flex-1 focus:ring-1 focus:ring-[#006b2c] outline-none" placeholder="Enter HFR ID" type="text" />
                        <button className="bg-[#16a34a] text-white text-xs px-4 py-2 rounded font-medium hover:opacity-90" type="button">Link</button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            <section className="col-span-12 bg-[#eff6ea] border border-gray-100 rounded-xl p-6 flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center text-[#00873a] mr-4">
                  <span className="material-symbols-outlined">shield</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">Security &amp; Compliance</p>
                  <p className="text-xs text-[#3e4a3d]">Your clinic data is encrypted and HIPAA/GDPR compliant by default.</p>
                </div>
              </div>
              <a className="text-xs font-semibold text-[#2563eb] hover:underline" href="#">Download Security Audit Log</a>
            </section>
          </div>
        </div>
      </main>

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}

export default SettingsEditProfilePage
