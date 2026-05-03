import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NotificationsDrawer from './NotificationsDrawer'

function SettingsTeamMembersPage() {
  const navigate = useNavigate()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  return (
    <div className="bg-[#f4fcf0] text-[#171d16] antialiased overflow-hidden">
      <aside className="w-[240px] h-full fixed left-0 top-0 bg-[#111827] border-r border-gray-800 flex flex-col py-6 text-sm z-50">
        <div className="px-6 mb-8 flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-[#16a34a] flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-xl">medical_services</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">MedGenie</h1>
            <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Provider</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          <button className="text-gray-400 hover:text-white flex items-center px-4 py-2 hover:bg-gray-800 w-full" onClick={() => navigate('/dashboard')} type="button">
            <span className="material-symbols-outlined mr-3">dashboard</span>Dashboard
          </button>
          <button className="text-gray-400 hover:text-white flex items-center px-4 py-2 hover:bg-gray-800 w-full" onClick={() => navigate('/calendar')} type="button">
            <span className="material-symbols-outlined mr-3">calendar_today</span>Calendar
          </button>
          <button className="text-gray-400 hover:text-white flex items-center px-4 py-2 hover:bg-gray-800 w-full" onClick={() => navigate('/visits')} type="button">
            <span className="material-symbols-outlined mr-3">clinical_notes</span>Visits
          </button>
          <button className="text-gray-400 hover:text-white flex items-center px-4 py-2 hover:bg-gray-800 w-full" onClick={() => navigate('/templates')} type="button">
            <span className="material-symbols-outlined mr-3">description</span>Templates
          </button>
          <button className="bg-[#2563eb] text-white rounded-lg mx-2 flex items-center px-4 py-2 border-l-4 border-white w-[calc(100%-1rem)]" type="button">
            <span className="material-symbols-outlined mr-3">settings</span>Settings
          </button>
        </nav>
      </aside>

      <main className="ml-[240px] flex flex-col h-screen overflow-y-auto">
        <header className="fixed top-0 right-0 w-[calc(100%-240px)] h-16 bg-white border-b border-gray-200 flex items-center justify-end px-8 z-40">
          <div className="flex items-center space-x-6">
            <button className="text-gray-500 hover:opacity-80 transition-opacity" type="button">
              <span className="material-symbols-outlined">language</span>
            </button>
            <button className="text-gray-500 hover:opacity-80 transition-opacity relative" onClick={() => setIsNotificationsOpen(true)} type="button">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-0 right-0 w-2 h-2 bg-[#ba1a1a] rounded-full" />
            </button>
            <div className="h-8 w-px bg-gray-200" />
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">Dr. Julian Vance</p>
                <p className="text-xs text-gray-500">Chief Surgeon</p>
              </div>
              <img alt="Dr. Profile" className="w-10 h-10 rounded-full border border-gray-200 object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBwpnDGj9s675sTRfsIFdZgRBU7q3GQk4q_agSTb6Cwu0Dy8l7atZ0QI7faMUliT5IlTGZ9_VdiZSiXlYE8TtzVmaFs3bj8wn3Es3QVwFlejJhrBUfEvrvpWxVJEC7D1wfBSjbjbDlwjxA5-_h1V8GGlozrp6c90kE9VbF8ZJe5YvFgTXWEraMUjO2cLACgOvZ6KUXQX639C-JpRFpXIaFSRZ-GusgeySP2TmAa01Ub0XqW8uy9TuhcxMgz5sybLX9AbGq4brfGkB0D" />
            </div>
          </div>
        </header>

        <div className="mt-16 p-8 flex-1">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h2 className="text-[28px] font-bold">Organization Settings</h2>
              <p className="text-[#3e4a3d] mt-2">Manage your clinical team members and organization-wide configurations.</p>
            </div>

            <nav className="flex space-x-8 mb-8 border-b border-[#bdcaba]">
              <button className="pb-4 text-gray-500 font-medium hover:text-[#006b2c]" onClick={() => navigate('/settings')} type="button">Profile</button>
              <button className="pb-4 text-gray-500 font-medium hover:text-[#006b2c]" onClick={() => navigate('/settings/edit-profile')} type="button">Organization</button>
              <button className="pb-4 text-[#2563eb] font-semibold border-b-2 border-[#2563eb]" type="button">Team Members</button>
            </nav>

            <div className="flex justify-between items-center mb-6">
              <div className="relative w-72">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-sm">search</span>
                <input className="w-full pl-10 pr-4 py-2 text-sm border border-[#bdcaba] rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] bg-white" placeholder="Search members..." type="text" />
              </div>
              <button className="bg-[#16a34a] text-white px-5 py-2.5 rounded-lg flex items-center font-semibold text-sm hover:opacity-90 shadow-sm" type="button">
                <span className="material-symbols-outlined mr-2">person_add</span>+ Add Member
              </button>
            </div>

            <div className="bg-white rounded-xl border border-[#bdcaba] overflow-hidden mb-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#eff6ea] border-b border-[#bdcaba]">
                      <th className="px-6 py-4 text-[13px] tracking-wider text-[#3e4a3d] uppercase">Name</th>
                      <th className="px-6 py-4 text-[13px] tracking-wider text-[#3e4a3d] uppercase">Role</th>
                      <th className="px-6 py-4 text-[13px] tracking-wider text-[#3e4a3d] uppercase">Email</th>
                      <th className="px-6 py-4 text-[13px] tracking-wider text-[#3e4a3d] uppercase">Status</th>
                      <th className="px-6 py-4 text-[13px] tracking-wider text-[#3e4a3d] uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#bdcaba]">
                    <tr className="hover:bg-[#e9f0e5]">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <img alt="Dr. Sarah Chen" className="w-10 h-10 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA8BrfG3TKuNsMpDzK7xFPpPArUMaKgLei6bEEuVsdZcQda2glCS8kx8ifd_XzHHtAGZOPAMMbGG5552xkd4-hiML9bZBoFot-rAGvVbqit0HAqol7S_07xKziup4XWqsWAxXkAEWnEajTENJalR8Gl830qn9MAXAYiuedE7NT33bp0APpPlLvSnNRkUQ4wZL8v3I1q9wUijyrlXDhWsIpnGD8IJwZzfA-QnnHt752nKon24RW3Xjo2p2C8CxfOSU7f-6e-5DdNJ2ph" />
                          <div>
                            <p className="font-semibold">Dr. Sarah Chen</p>
                            <p className="text-xs text-[#3e4a3d]">Chief of Staff</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#2563eb]/10 text-[#2563eb]">Doctor</span></td>
                      <td className="px-6 py-4 text-[#3e4a3d] text-sm">s.chen@medgenie.pro</td>
                      <td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2" />Active</span></td>
                      <td className="px-6 py-4 text-right"><button className="text-gray-400 hover:text-[#ba1a1a]" type="button"><span className="material-symbols-outlined">delete</span></button></td>
                    </tr>
                    <tr className="hover:bg-[#e9f0e5]">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <img alt="Mark Thompson" className="w-10 h-10 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDvcquLCdDbqKi22No4TPTyn3mY-XE4Jg_Rp_6OIsQqzKOdPLTXvPn22XDdagEMxup8by3zUCIv9pSU1k10ls3k3q0pgGe5nuqeX8QMWHuIfIuMNWwM9Un0Dg3ZZuh-h3QrkWEVDxpLwboTyT8PvuZWT20pJqs8o46dp7CwMOnsxd2s4toxkQGYK6BnfckYCIOTN8Qtad3BU2NHFgfHss4ZDCDTzBdl4tG5rHPDgt_dVra-PfvktGOWL-4BqUDZVxBuwMzVh2isGh6F" />
                          <div>
                            <p className="font-semibold">Mark Thompson</p>
                            <p className="text-xs text-[#3e4a3d]">ER Specialist</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#3b82f6]/10 text-[#3b82f6]">Nurse</span></td>
                      <td className="px-6 py-4 text-[#3e4a3d] text-sm">m.thompson@medgenie.pro</td>
                      <td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2" />Active</span></td>
                      <td className="px-6 py-4 text-right"><button className="text-gray-400 hover:text-[#ba1a1a]" type="button"><span className="material-symbols-outlined">delete</span></button></td>
                    </tr>
                    <tr className="hover:bg-[#e9f0e5]">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="material-symbols-outlined text-gray-500">person</span>
                          </div>
                          <div>
                            <p className="font-semibold">Elena Rodriguez</p>
                            <p className="text-xs text-[#3e4a3d]">Clinic Manager</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">Admin</span></td>
                      <td className="px-6 py-4 text-[#3e4a3d] text-sm">e.rodriguez@medgenie.pro</td>
                      <td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-2" />Pending</span></td>
                      <td className="px-6 py-4 text-right"><button className="text-gray-400 hover:text-[#ba1a1a]" type="button"><span className="material-symbols-outlined">delete</span></button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="bg-[#eff6ea] px-6 py-3 border-t border-[#bdcaba] flex justify-between items-center">
                <p className="text-xs text-[#3e4a3d]">Showing 3 of 12 members</p>
                <div className="flex space-x-2">
                  <button className="p-1 rounded hover:bg-gray-200" type="button"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
                  <button className="p-1 rounded hover:bg-gray-200" type="button"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-[#bdcaba] p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-[18px] font-semibold mb-1">Seat Availability</h3>
                    <p className="text-sm text-[#3e4a3d]">Your current plan subscription details.</p>
                  </div>
                  <span className="material-symbols-outlined text-gray-400">group</span>
                </div>
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[#3e4a3d]">12 of 20 seats used</span>
                    <span className="font-semibold text-[#006b2c]">60%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-[#006b2c] h-2 rounded-full w-[60%]" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-6 p-4 bg-[#eff6ea] rounded-lg">
                  <div className="flex items-center">
                    <span className="material-symbols-outlined text-[#16a34a] mr-3">verified</span>
                    <div>
                      <p className="text-sm font-semibold">Pro Plan Active</p>
                      <p className="text-xs text-[#3e4a3d]">Next billing on Oct 12, 2023</p>
                    </div>
                  </div>
                  <button className="text-[#2563eb] text-sm font-semibold hover:underline" type="button">Upgrade</button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-[#bdcaba] p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-[18px] font-semibold mb-1">Organization Privacy</h3>
                    <p className="text-sm text-[#3e4a3d]">Control member access and visibility.</p>
                  </div>
                  <span className="material-symbols-outlined text-gray-400">shield</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">HIPAA Compliant Logging</p>
                      <p className="text-xs text-[#3e4a3d]">Detailed audit trails for all actions.</p>
                    </div>
                    <div className="inline-flex h-5 w-10 rounded-full bg-[#16a34a]"><span className="translate-x-5 inline-block h-4 w-4 m-[2px] rounded-full bg-white" /></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Enforce Two-Factor (2FA)</p>
                      <p className="text-xs text-[#3e4a3d]">Require all members to use 2FA.</p>
                    </div>
                    <div className="inline-flex h-5 w-10 rounded-full bg-gray-200"><span className="inline-block h-4 w-4 m-[2px] rounded-full bg-white" /></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Public Profile Visibility</p>
                      <p className="text-xs text-[#3e4a3d]">Show provider profiles on public search.</p>
                    </div>
                    <div className="inline-flex h-5 w-10 rounded-full bg-[#16a34a]"><span className="translate-x-5 inline-block h-4 w-4 m-[2px] rounded-full bg-white" /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}

export default SettingsTeamMembersPage
