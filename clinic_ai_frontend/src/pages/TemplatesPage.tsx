import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NotificationsDrawer from './NotificationsDrawer'

function TemplatesPage() {
  const navigate = useNavigate()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  return (
    <div className="bg-[#f4fcf0] text-[#171d16] antialiased min-h-screen font-inter">
      <aside className="w-[240px] h-full fixed left-0 top-0 bg-[#111827] border-r border-gray-800 flex flex-col py-6 z-50">
        <div className="px-6 mb-10">
          <h1 className="text-xl font-bold text-white">MedGenie</h1>
          <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Provider</p>
        </div>
        <nav className="flex-1 space-y-1">
          <button className="text-gray-400 hover:text-white flex items-center px-4 py-2 hover:bg-gray-800 w-full" onClick={() => navigate('/dashboard')} type="button">
            <span className="material-symbols-outlined mr-3">dashboard</span>
            <span className="text-sm">Dashboard</span>
          </button>
          <button className="text-gray-400 hover:text-white flex items-center px-4 py-2 hover:bg-gray-800 w-full" onClick={() => navigate('/calendar')} type="button">
            <span className="material-symbols-outlined mr-3">calendar_today</span>
            <span className="text-sm">Calendar</span>
          </button>
          <button className="text-gray-400 hover:text-white flex items-center px-4 py-2 hover:bg-gray-800 w-full" onClick={() => navigate('/visits')} type="button">
            <span className="material-symbols-outlined mr-3">clinical_notes</span>
            <span className="text-sm">Visits</span>
          </button>
          <button className="bg-[#2563eb] text-white rounded-lg mx-2 flex items-center px-4 py-2 border-l-4 border-white transition-all scale-[0.98] w-[calc(100%-1rem)]" type="button">
            <span className="material-symbols-outlined mr-3">description</span>
            <span className="text-sm">Templates</span>
          </button>
          <button className="text-gray-400 hover:text-white flex items-center px-4 py-2 hover:bg-gray-800 w-full" onClick={() => navigate('/settings')} type="button">
            <span className="material-symbols-outlined mr-3">settings</span>
            <span className="text-sm">Settings</span>
          </button>
        </nav>
        <div className="mt-auto px-2">
          <a className="text-gray-400 hover:text-white flex items-center px-4 py-2 hover:bg-gray-800 rounded-lg" href="#">
            <span className="material-symbols-outlined mr-3">logout</span>
            <span className="text-sm">Logout</span>
          </a>
        </div>
      </aside>

      <header className="fixed top-0 right-0 w-[calc(100%-240px)] h-16 bg-white border-b border-gray-200 flex items-center justify-end px-8 z-40">
        <div className="flex items-center gap-6">
          <button className="text-gray-500 hover:opacity-80 transition-opacity" type="button">
            <span className="material-symbols-outlined">language</span>
          </button>
          <button className="text-gray-500 hover:opacity-80 transition-opacity relative" onClick={() => setIsNotificationsOpen(true)} type="button">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-0 right-0 w-2 h-2 bg-[#ba1a1a] rounded-full" />
          </button>
          <div className="flex items-center gap-3 border-l border-gray-200 pl-6">
            <div className="text-right">
              <p className="text-sm font-semibold">Dr. Rajesh Kumar</p>
              <p className="text-xs text-gray-500">General Physician</p>
            </div>
            <img
              alt="Dr. Profile"
              className="w-10 h-10 rounded-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAuBbbeRYNHax1NbrWkifhw0L3CRGWeyHIESTSxKepNPOX2ITi5HCrZUIYfH6VdN0_bRq07G_EQgfr_SFMnukiUeX8MGzOjG5LlSZzEqfxY9T3eODDwdxMHiUlOWv_eBYJ211Zk35CMrL9z9hg6rbZprdgbxsYyVgdt0xVWQP0BSlRRGnKWJRPoI_dz-ApyJnT2a_2qyoJfex3WBB95OuByf8lX6aUB1wKg6zmWBKsvxMaTyYr63KwgXugcdPC09VqETyf5awGoV99m"
            />
          </div>
        </div>
      </header>

      <main className="ml-[240px] pt-16 min-h-screen">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-[28px] leading-[1.2] tracking-[-0.02em] font-bold">Clinical Templates</h2>
              <p className="text-[#3e4a3d] mt-1">Manage and create reusable clinical documentation structures.</p>
            </div>
            <button className="bg-[#16a34a] text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:opacity-90 active:scale-95 shadow-sm" type="button">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'wght' 600" }}>add</span>
              <span>+ Create New Template</span>
            </button>
          </div>

          <div className="flex items-center border-b border-[#bdcaba] mb-8">
            <button className="px-6 py-4 border-b-2 border-[#006b2c] text-[#006b2c] font-semibold flex items-center gap-2" type="button">
              My Templates <span className="bg-[#00873a] text-[#f7fff2] text-xs px-2 py-0.5 rounded-full">0</span>
            </button>
            <button className="px-6 py-4 text-[#575e70] hover:text-[#006b2c] transition-colors flex items-center gap-2" type="button">
              Practice <span className="bg-[#e3eadf] text-[#3e4a3d] text-xs px-2 py-0.5 rounded-full">0</span>
            </button>
            <button className="px-6 py-4 text-[#575e70] hover:text-[#006b2c] transition-colors flex items-center gap-2" type="button">
              Community <span className="bg-[#e3eadf] text-[#3e4a3d] text-xs px-2 py-0.5 rounded-full">0</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-4 mb-8">
            <div className="flex-1 min-w-[300px] relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6e7b6c]">search</span>
              <input
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#bdcaba] bg-white focus:ring-2 focus:ring-[#2563eb] focus:border-transparent outline-none transition-all"
                placeholder="Search templates by name or specialty..."
                type="text"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#bdcaba] bg-white text-[#3e4a3d] hover:bg-[#e9f0e5] hover:text-[#171d16] transition-all" type="button">
              <span className="material-symbols-outlined">filter_list</span>
              <span>Filters</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#bdcaba] bg-white text-[#3e4a3d] hover:bg-[#e9f0e5] hover:text-[#171d16] transition-all" type="button">
              <span className="material-symbols-outlined">sort</span>
              <span>Recent</span>
            </button>
          </div>

          <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-[#bdcaba] rounded-2xl">
            <div className="w-20 h-20 bg-[#00873a]/20 rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-[#006b2c] text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome_motion</span>
            </div>
            <h3 className="text-[18px] font-semibold mb-2">No templates found</h3>
            <p className="text-[#3e4a3d] text-center max-w-sm mb-8">
              You haven&apos;t created any custom templates yet. Start by creating one from scratch or explore the library.
            </p>
            <button className="bg-[#16a34a] text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg active:scale-95 transition-all" type="button">
              <span className="material-symbols-outlined">add_circle</span>
              <span>+ Create New Template</span>
            </button>
          </div>

          <div className="mt-16">
            <h4 className="text-[#3e4a3d] uppercase tracking-widest text-[13px] mb-6">Recommended for you</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-[#006b2c] transition-all group cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-[#00873a]/20 group-hover:text-[#006b2c] transition-colors">
                    <span className="material-symbols-outlined">stethoscope</span>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">POPULAR</span>
                </div>
                <h5 className="text-[18px] font-semibold mb-1">General OPD</h5>
                <p className="text-sm text-[#3e4a3d] mb-6 line-clamp-2">Standard Indian OPD structure including Chief Complaints, History, Examination, and Rx.</p>
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-xs text-[#6e7b6c] flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">schedule</span>12 min read
                  </span>
                  <button className="text-[#006b2c] font-semibold text-sm hover:underline" type="button">Use Template</button>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-[#006b2c] transition-all group cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-[#00873a]/20 group-hover:text-[#006b2c] transition-colors">
                    <span className="material-symbols-outlined">blood_pressure</span>
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">CHRONIC</span>
                </div>
                <h5 className="text-[18px] font-semibold mb-1">Diabetes Follow-up</h5>
                <p className="text-sm text-[#3e4a3d] mb-6 line-clamp-2">Optimized for HbA1c tracking, foot exams, and metformin/insulin adjustments.</p>
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-xs text-[#6e7b6c] flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">schedule</span>8 min read
                  </span>
                  <button className="text-[#006b2c] font-semibold text-sm hover:underline" type="button">Use Template</button>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-[#006b2c] transition-all group cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-green-50 text-green-600 rounded-lg group-hover:bg-[#00873a]/20 group-hover:text-[#006b2c] transition-colors">
                    <span className="material-symbols-outlined">child_care</span>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">WELLNESS</span>
                </div>
                <h5 className="text-[18px] font-semibold mb-1">Pediatric Wellness</h5>
                <p className="text-sm text-[#3e4a3d] mb-6 line-clamp-2">Growth tracking (height/weight), vaccination status, and milestone assessment.</p>
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-xs text-[#6e7b6c] flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">schedule</span>15 min read
                  </span>
                  <button className="text-[#006b2c] font-semibold text-sm hover:underline" type="button">Use Template</button>
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

export default TemplatesPage
