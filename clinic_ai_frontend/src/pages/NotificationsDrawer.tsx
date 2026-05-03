type NotificationsDrawerProps = {
  isOpen: boolean
  onClose: () => void
}

function NotificationsDrawer({ isOpen, onClose }: NotificationsDrawerProps) {
  if (!isOpen) return null

  return (
    <>
      <button
        aria-label="Close notifications overlay"
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
        type="button"
      />

      <aside className="fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#2563eb]">notifications_active</span>
            <h2 className="text-lg font-bold text-[#171d16]">Notifications</h2>
          </div>
          <button className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors" onClick={onClose} type="button">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="px-2 pt-2 border-b border-gray-100 bg-gray-50/50">
          <div className="flex gap-1 overflow-x-auto">
            <button className="px-4 py-3 text-sm font-semibold border-b-2 border-[#2563eb] text-[#2563eb] whitespace-nowrap" type="button">
              All <span className="ml-1 bg-[#2563eb] text-white text-[10px] px-1.5 py-0.5 rounded-full">4</span>
            </button>
            <button className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-[#171d16] whitespace-nowrap" type="button">Patients</button>
            <button className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-[#171d16] whitespace-nowrap" type="button">System</button>
            <button className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-[#171d16] whitespace-nowrap" type="button">WhatsApp</button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto bg-white">
          <div className="p-4 border-b border-gray-50 hover:bg-gray-50/80 transition-colors relative">
            <div className="absolute right-4 top-4 w-2 h-2 bg-[#2563eb] rounded-full" />
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-[#16a34a]">
                <span className="material-symbols-outlined">clinical_notes</span>
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[13px] tracking-[0.05em] font-medium text-[#16a34a] uppercase">OPD Note Generated</span>
                  <span className="text-[11px] text-gray-500 font-medium">12m ago</span>
                </div>
                <p className="text-sm font-medium text-[#171d16] mb-1">Visit Note: Arthur Morgan</p>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">AI has completed the transcription for the 10:15 AM session. Please review and sign.</p>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 bg-[#16a34a] text-white text-xs font-semibold rounded hover:bg-opacity-90 transition-all" type="button">Review Note</button>
                  <button className="px-3 py-1.5 border border-gray-200 text-[#171d16] text-xs font-semibold rounded hover:bg-gray-50 transition-all" type="button">Discard</button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-gray-50 hover:bg-gray-50/80 transition-colors relative">
            <div className="absolute right-4 top-4 w-2 h-2 bg-[#2563eb] rounded-full" />
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#2563eb]">
                <span className="material-symbols-outlined">biotech</span>
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[13px] tracking-[0.05em] font-medium text-[#2563eb] uppercase">Lab Results</span>
                  <span className="text-[11px] text-gray-500 font-medium">1h ago</span>
                </div>
                <p className="text-sm font-medium text-[#171d16] mb-1">Lab Report: Sarah Connor</p>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">Comprehensive Metabolic Panel (CMP) results are now available for review.</p>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 bg-[#2563eb] text-white text-xs font-semibold rounded hover:bg-opacity-90 transition-all" type="button">View Results</button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#25d366]/10 flex items-center justify-center text-[#128c7e]">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>chat_bubble</span>
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[13px] tracking-[0.05em] font-medium text-[#128c7e] uppercase">WhatsApp Message</span>
                  <span className="text-[11px] text-gray-500 font-medium">3h ago</span>
                </div>
                <p className="text-sm font-medium text-[#171d16] mb-1">John Marston (Patient)</p>
                <p className="text-xs text-gray-500 leading-relaxed mb-3 italic">"Doctor, I&apos;m feeling much better today. Should I continue the current dosage for another week?"</p>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 bg-[#128c7e] text-white text-xs font-semibold rounded hover:bg-opacity-90 transition-all flex items-center gap-1" type="button">
                    <span className="material-symbols-outlined text-xs">reply</span> Reply Now
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                <span className="material-symbols-outlined">update</span>
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[13px] tracking-[0.05em] font-medium text-gray-500 uppercase">System Notice</span>
                  <span className="text-[11px] text-gray-500 font-medium">Yesterday</span>
                </div>
                <p className="text-sm font-medium text-[#171d16] mb-1">Maintenance Scheduled</p>
                <p className="text-xs text-gray-500 leading-relaxed">MedGenie servers will undergo brief maintenance on Sunday, June 12, at 2:00 AM UTC.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <button className="w-full py-2.5 text-sm font-semibold text-gray-500 hover:text-[#2563eb] flex items-center justify-center gap-2 transition-colors" type="button">
            <span className="material-symbols-outlined text-sm">done_all</span>
            Mark all as read
          </button>
        </div>
      </aside>
    </>
  )
}

export default NotificationsDrawer
