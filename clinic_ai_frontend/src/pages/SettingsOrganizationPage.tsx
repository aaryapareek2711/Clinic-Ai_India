import { useState } from 'react'
import { useProviderIdentity } from '../hooks/useProviderIdentity'
import BackButton from '../components/BackButton'
import ProviderAvatar from '../components/ProviderAvatar'
import SettingsHeadingNav from '../components/SettingsHeadingNav'
import NotificationsDrawer from './NotificationsDrawer'

const showDigitalIntegrations = false

function SettingsOrganizationPage() {
  const provider = useProviderIdentity()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  return (
    <div className="font-manrope text-[#171d16] min-h-screen antialiased">
      <header className="fixed top-0 right-0 z-40 flex h-16 w-[calc(100%-240px)] items-center justify-between border-b border-gray-200 bg-white px-8">
        <div className="flex items-center gap-2">
          <BackButton className="-ml-2" to="/dashboard" />
          <h2 className="text-[28px] leading-[1.2] font-bold tracking-[-0.02em] text-[#171d16]">Settings</h2>
        </div>
        <div className="flex items-center gap-6">
          <button
            className="relative text-gray-500 transition-opacity hover:opacity-80"
            onClick={() => setIsNotificationsOpen(true)}
            type="button"
          >
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute right-0 top-0 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
          </button>
          <div className="flex items-center gap-3 border-l border-gray-200 pl-6">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">{provider.displayName}</p>
              <p className="text-xs text-gray-500">{provider.title}</p>
            </div>
            <ProviderAvatar
              className="border border-gray-200"
              imageUrl={provider.avatarUrl}
              label={provider.displayName}
              size="md"
            />
          </div>
        </div>
      </header>

      <main className="min-h-screen bg-[#f4fcf0]">
        <div className="mt-16 p-8">
          <div className="mx-auto max-w-6xl">
            <SettingsHeadingNav showHeading={false} />

          <div className="grid grid-cols-12 gap-8">
            <section className="col-span-12 rounded-xl border border-[#bdcaba] bg-white p-8">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h3 className="text-[18px] font-semibold text-[#171d16]">Clinic Profile</h3>
                  <p className="mt-1 text-sm text-[#3e4a3d]">
                    Manage your practice identification and location details.
                  </p>
                </div>
                <span className="rounded-full bg-[#22c55e]/10 px-3 py-1 text-xs font-semibold text-[#22c55e]">
                  Verified
                </span>
              </div>
              <form
                className="space-y-6"
                onSubmit={(e) => {
                  e.preventDefault()
                }}
              >
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-[13px] uppercase tracking-[0.05em] text-[#3e4a3d]">
                      Practice Name
                    </label>
                    <input
                      className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#2563eb]"
                      defaultValue="City Health Multispeciality"
                      type="text"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[13px] uppercase tracking-[0.05em] text-[#3e4a3d]">
                      Practice Type
                    </label>
                    <select
                      className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#2563eb]"
                      defaultValue="Group Practice"
                    >
                      <option>Solo Practice</option>
                      <option>Group Practice</option>
                      <option>Hospital</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[13px] uppercase tracking-[0.05em] text-[#3e4a3d]">
                    Street Address
                  </label>
                  <input
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#2563eb]"
                    defaultValue="Suite 402, Medical Enclave, Sector 15"
                    type="text"
                  />
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="block text-[13px] uppercase tracking-[0.05em] text-[#3e4a3d]">City</label>
                    <input
                      className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#2563eb]"
                      defaultValue="New Delhi"
                      type="text"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[13px] uppercase tracking-[0.05em] text-[#3e4a3d]">State</label>
                    <input
                      className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#2563eb]"
                      defaultValue="Delhi"
                      type="text"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[13px] uppercase tracking-[0.05em] text-[#3e4a3d]">Pincode</label>
                    <input
                      className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#2563eb]"
                      defaultValue="110016"
                      type="text"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <button
                    className="flex items-center rounded-lg bg-[#16a34a] px-8 py-2.5 font-semibold text-white transition-opacity hover:opacity-90"
                    type="submit"
                  >
                    <span className="material-symbols-outlined mr-2 text-sm">save</span>
                    Save Changes
                  </button>
                </div>
              </form>
            </section>

            {showDigitalIntegrations ? (
              <section className="col-span-12 rounded-xl border border-gray-200 bg-white p-8">
                <div className="mb-8">
                  <h3 className="text-[18px] font-semibold">Digital Integrations</h3>
                  <p className="mt-1 text-sm text-[#3e4a3d]">
                    Connect your clinic to national health systems and patient messaging platforms.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  <div className="flex items-start rounded-xl border border-transparent bg-[#e9f0e5] p-6 transition-all hover:border-[#16a34a]">
                    <div className="mr-4 rounded-lg bg-white p-3 shadow-sm">
                      <span className="material-symbols-outlined text-3xl text-[#16a34a]">chat</span>
                    </div>
                    <div className="flex-1">
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="font-semibold">WhatsApp Business</h4>
                        <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase bg-[#3b82f6]/10 text-[#3b82f6]">
                          Setup Pending
                        </span>
                      </div>
                      <p className="mb-4 text-xs text-[#3e4a3d]">
                        Automate appointment reminders and send prescriptions directly to patients via WhatsApp.
                      </p>
                      <button
                        className="rounded-lg bg-[#111827] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-gray-800"
                        type="button"
                      >
                        Configure API
                      </button>
                    </div>
                  </div>
                  <div className="flex items-start rounded-xl border border-transparent bg-[#e9f0e5] p-6 transition-all hover:border-[#16a34a]">
                    <div className="mr-4 rounded-lg bg-white p-3 shadow-sm">
                      <span className="material-symbols-outlined text-3xl text-[#16a34a]">account_balance</span>
                    </div>
                    <div className="flex-1">
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="font-semibold">ABDM Facility ID</h4>
                        <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase bg-[#f59e0b]/10 text-[#f59e0b]">
                          Action Required
                        </span>
                      </div>
                      <p className="mb-4 text-xs text-[#3e4a3d]">
                        Link your Ayushman Bharat Digital Mission Facility ID to enable national health records sync.
                      </p>
                      <div className="flex items-center space-x-2">
                        <input
                          className="flex-1 rounded border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-[#006b2c]"
                          placeholder="Enter HFR ID"
                          type="text"
                        />
                        <button
                          className="rounded bg-[#16a34a] px-4 py-2 text-xs font-medium text-white hover:opacity-90"
                          type="button"
                        >
                          Link
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

          </div>
        </div>
      </div>
      </main>

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}

export default SettingsOrganizationPage
