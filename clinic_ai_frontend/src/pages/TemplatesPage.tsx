import { useEffect, useMemo, useRef, useState } from 'react'
import CreateTemplateModal from '../components/CreateTemplateModal'
import { getApiErrorMessage } from '../lib/apiClient'
import { listClinicalTemplates, type ClinicalTemplateListItem } from '../services/templatesApi'
import NotificationsDrawer from './NotificationsDrawer'

const RECOMMENDED_TEMPLATES = [
  {
    id: 'general-opd',
    specialty: 'general',
    updatedOrder: 0,
    tag: 'POPULAR',
    tagClass: 'bg-blue-100 text-blue-700',
    iconWrap: 'bg-blue-50 text-blue-600',
    icon: 'stethoscope' as const,
    title: 'General OPD',
    description: 'Standard Indian OPD structure including Chief Complaints, History, Examination, and Rx.',
    readMins: 12,
  },
  {
    id: 'diabetes',
    specialty: 'chronic',
    updatedOrder: 1,
    tag: 'CHRONIC',
    tagClass: 'bg-amber-100 text-amber-700',
    iconWrap: 'bg-amber-50 text-amber-600',
    icon: 'blood_pressure' as const,
    title: 'Diabetes Follow-up',
    description: 'Optimized for HbA1c tracking, foot exams, and metformin/insulin adjustments.',
    readMins: 8,
  },
  {
    id: 'pediatric',
    specialty: 'pediatrics',
    updatedOrder: 2,
    tag: 'WELLNESS',
    tagClass: 'bg-green-100 text-green-700',
    iconWrap: 'bg-green-50 text-green-600',
    icon: 'child_care' as const,
    title: 'Pediatric Wellness',
    description: 'Growth tracking (height/weight), vaccination status, and milestone assessment.',
    readMins: 15,
  },
] as const

function TemplatesPage() {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [templateSavedMessage, setTemplateSavedMessage] = useState<string | null>(null)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('name')
  const filtersRef = useRef<HTMLDivElement>(null)
  const [myTemplates, setMyTemplates] = useState<ClinicalTemplateListItem[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [templatesError, setTemplatesError] = useState<string | null>(null)
  const [templateSearch, setTemplateSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [templatesTotal, setTemplatesTotal] = useState(0)
  const [templatesRefreshNonce, setTemplatesRefreshNonce] = useState(0)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(templateSearch), 400)
    return () => window.clearTimeout(timer)
  }, [templateSearch])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        if (!cancelled) {
          setTemplatesLoading(true)
          setTemplatesError(null)
        }
        const specialty = specialtyFilter !== 'all' ? specialtyFilter : undefined
        const res = await listClinicalTemplates({
          search: debouncedSearch.trim() || undefined,
          specialty,
          page_size: 100,
        })
        const items = [...res.items]
        if (!cancelled) setTemplatesTotal(res.total)
        if (sortBy === 'name') {
          items.sort((a, b) => a.name.localeCompare(b.name))
        }
        if (!cancelled) setMyTemplates(items)
      } catch (e) {
        if (!cancelled) setTemplatesError(getApiErrorMessage(e))
      } finally {
        if (!cancelled) setTemplatesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [specialtyFilter, debouncedSearch, sortBy, templatesRefreshNonce])

  useEffect(() => {
    if (!isFiltersOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setIsFiltersOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [isFiltersOpen])

  const filteredRecommended = useMemo(() => {
    let list = [...RECOMMENDED_TEMPLATES]
    if (specialtyFilter !== 'all') {
      list = list.filter((t) => t.specialty === specialtyFilter)
    }
    if (sortBy === 'name') {
      list.sort((a, b) => a.title.localeCompare(b.title))
    } else if (sortBy === 'recent') {
      list.sort((a, b) => b.updatedOrder - a.updatedOrder)
    }
    return list
  }, [specialtyFilter, sortBy])

  return (
    <div className="text-[#171d16] antialiased min-h-screen font-inter">
      <header className="fixed top-0 right-0 w-[calc(100%-240px)] h-16 bg-white border-b border-gray-200 flex items-center justify-end px-8 z-40">
        <div className="flex items-center gap-6">
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

      <main className="pt-16 min-h-screen">
        <div className="p-8">
          {templateSavedMessage && (
            <div className="mb-4 rounded-xl border border-[#00873a]/30 bg-[#eff6ea] px-4 py-3 text-sm text-[#0f3920]" role="status">
              {templateSavedMessage}
            </div>
          )}
          <div className="mb-8">
            <h2 className="text-[28px] leading-[1.2] tracking-[-0.02em] font-bold">Clinical Templates</h2>
            <p className="text-[#3e4a3d] mt-1">Manage and create reusable clinical documentation structures.</p>
          </div>

          <div className="flex items-center border-b border-[#bdcaba] mb-8">
            <div className="flex items-center gap-2 border-b-2 border-[#006b2c] py-4 font-semibold text-[#006b2c]">
              My Templates{' '}
              <span className="rounded-full bg-[#00873a] px-2 py-0.5 text-xs text-[#f7fff2]">{templatesTotal}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-8">
            <div className="flex-1 min-w-[300px] relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6e7b6c]">search</span>
              <input
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#bdcaba] bg-white transition-all outline-none focus:border-transparent focus:ring-2 focus:ring-[#2563eb]"
                placeholder="Search templates by name or specialty..."
                type="text"
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
              />
            </div>
            <div className="relative self-start" ref={filtersRef}>
              <button
                aria-expanded={isFiltersOpen}
                aria-haspopup="true"
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#bdcaba] bg-white text-[#3e4a3d] hover:bg-[#e9f0e5] hover:text-[#171d16] transition-all ${isFiltersOpen ? 'ring-2 ring-[#2563eb] border-transparent' : ''}`}
                onClick={() => setIsFiltersOpen((o) => !o)}
                type="button"
              >
                <span className="material-symbols-outlined">filter_list</span>
                <span>Filters</span>
                <span className="material-symbols-outlined text-lg text-[#6e7b6c]">{isFiltersOpen ? 'expand_less' : 'expand_more'}</span>
              </button>
              {isFiltersOpen && (
                <div
                  className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[min(100vw-2rem,20rem)] rounded-xl border border-[#bdcaba] bg-white p-4 shadow-lg"
                  role="dialog"
                  aria-label="Template filters"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#6e7b6c] mb-3">Filter by</p>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#171d16]" htmlFor="template-specialty">
                        Specialty
                      </label>
                      <div className="relative">
                        <select
                          className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-9 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                          id="template-specialty"
                          value={specialtyFilter}
                          onChange={(e) => setSpecialtyFilter(e.target.value)}
                        >
                          <option value="all">All specialties</option>
                          <option value="general">General OPD</option>
                          <option value="pediatrics">Pediatrics</option>
                          <option value="chronic">Chronic care</option>
                        </select>
                        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[#6e7b6c]">
                          <span className="material-symbols-outlined text-xl">expand_more</span>
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#171d16]" htmlFor="template-sort">
                        Sort recommended
                      </label>
                      <div className="relative">
                        <select
                          className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-9 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                          id="template-sort"
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                        >
                          <option value="name">Name (A–Z)</option>
                          <option value="recent">Recently updated</option>
                        </select>
                        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[#6e7b6c]">
                          <span className="material-symbols-outlined text-xl">expand_more</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2 border-t border-gray-100 pt-3">
                    <button
                      className="rounded-lg px-3 py-2 text-sm font-medium text-[#575e70] hover:bg-gray-50"
                      onClick={() => {
                        setSpecialtyFilter('all')
                        setSortBy('name')
                      }}
                      type="button"
                    >
                      Clear
                    </button>
                    <button
                      className="rounded-lg bg-[#006b2c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#00873a]"
                      onClick={() => setIsFiltersOpen(false)}
                      type="button"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {templatesError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{templatesError}</div>
          )}

          <div className="rounded-2xl border border-dashed border-[#bdcaba] bg-white py-12">
            {templatesLoading && <p className="text-center text-sm text-[#575e70]">Loading templates…</p>}
            {!templatesLoading && myTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#00873a]/20">
                  <span className="material-symbols-outlined text-4xl text-[#006b2c]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    auto_awesome_motion
                  </span>
                </div>
                <h3 className="mb-2 text-[18px] font-semibold">No templates found</h3>
                <p className="mb-8 max-w-sm text-center text-[#3e4a3d]">
                  None returned from `/api/templates` with the current filters. Create one below or widen search.
                </p>
                <button
                  className="flex items-center gap-2 rounded-xl bg-[#16a34a] px-8 py-3 font-semibold text-white transition-all hover:shadow-lg active:scale-95"
                  onClick={() => setIsCreateModalOpen(true)}
                  type="button"
                >
                  <span className="material-symbols-outlined">add_circle</span>
                  <span>Create New Template</span>
                </button>
              </div>
            ) : (
              !templatesLoading && (
                <div className="grid grid-cols-1 gap-4 px-8 md:grid-cols-2 lg:grid-cols-3">
                  {myTemplates.map((t) => (
                    <div key={t.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                      <h5 className="mb-1 text-lg font-semibold">{t.name}</h5>
                      <p className="mb-2 line-clamp-3 text-sm text-[#3e4a3d]">{t.description || '—'}</p>
                      <p className="text-xs uppercase tracking-wide text-[#575e70]">{t.specialty || t.category}</p>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          <div className="mt-16">
            <h4 className="text-[#3e4a3d] uppercase tracking-widest text-[13px] mb-6">Recommended for you</h4>
            {filteredRecommended.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#bdcaba] bg-white px-6 py-10 text-center text-sm text-[#3e4a3d]">
                No templates match the selected filters. Try &quot;All specialties&quot; or clear filters.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredRecommended.map((t) => (
                  <div
                    key={t.id}
                    className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-[#006b2c]"
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div
                        className={`rounded-lg p-3 transition-colors group-hover:bg-[#00873a]/20 group-hover:text-[#006b2c] ${t.iconWrap}`}
                      >
                        <span className="material-symbols-outlined">{t.icon}</span>
                      </div>
                      <span className={`rounded px-2 py-1 text-xs ${t.tagClass}`}>{t.tag}</span>
                    </div>
                    <h5 className="mb-1 text-[18px] font-semibold">{t.title}</h5>
                    <p className="mb-6 line-clamp-2 text-sm text-[#3e4a3d]">{t.description}</p>
                    <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                      <span className="flex items-center gap-1 text-xs text-[#6e7b6c]">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        {t.readMins} min read
                      </span>
                      <button className="text-sm font-semibold text-[#006b2c] hover:underline" type="button">
                        Use Template
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />

      <CreateTemplateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => {
          setTemplateSavedMessage('Template saved successfully.')
          setTemplatesRefreshNonce((n) => n + 1)
        }}
      />
    </div>
  )
}

export default TemplatesPage
