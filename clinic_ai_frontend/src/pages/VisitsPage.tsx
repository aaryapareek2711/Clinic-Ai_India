import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'

import BackButton from '../components/BackButton'
import ProviderHeaderProfileMenu from '../components/ProviderHeaderProfileMenu'
import { getApiErrorMessage } from '../lib/apiClient'
import { computeVisitDateRange, presetAnchoredToLiveToday, ymdFromLocalDate, ymdToLocalStart, type VisitDatePresetId } from '../lib/visitDateRangePresets'
import {
  fetchProviderVisitsPaged,
  getSignedInProviderId,
  resolveSignedInProviderId,
} from '../services/visitWorkflowApi'
import NotificationsDrawer from './NotificationsDrawer'
import VisitKanbanBoard from './visit/VisitKanbanBoard'
import VisitDateRangeFilter from './visit/VisitDateRangeFilter'
import type { VisitKanbanCardModel } from './visit/visit-kanban-utils'
import { KANBAN_STAGES, type VisitKanbanSortKey, type VisitKanbanSortScope } from './visit/visit-kanban-utils'

type VisitSort = VisitKanbanSortKey
const PAGE_SIZE = 10
/** Shorter interval so Kanban picks up transcription_session updates soon after upload. */
const AUTO_REFRESH_MS = 5_000
const MIN_FOCUS_REFRESH_GAP_MS = 8_000

function VisitsPage() {
  const navigate = useNavigate()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<VisitSort>('patient_newest')
  const [sortScope, setSortScope] = useState<VisitKanbanSortScope>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [datePreset, setDatePreset] = useState<VisitDatePresetId>('today')
  const [customFromYmd, setCustomFromYmd] = useState(() => ymdFromLocalDate(new Date()))
  const [customToYmd, setCustomToYmd] = useState(() => ymdFromLocalDate(new Date()))
  const [monthMenuAnchorYmd, setMonthMenuAnchorYmd] = useState<string | null>(null)
  const lastFocusRefetchAtRef = useRef(0)
  const search = useMemo(() => searchQuery.trim() || undefined, [searchQuery])
  const appliedMenuMonthStart =
    monthMenuAnchorYmd != null && monthMenuAnchorYmd !== ''
      ? ymdToLocalStart(monthMenuAnchorYmd, new Date())
      : undefined
  const rangeOpts =
    !presetAnchoredToLiveToday(datePreset) && appliedMenuMonthStart
      ? { menuMonthStart: appliedMenuMonthStart }
      : undefined
  const { rangeStartIso, rangeEndExclusiveIso } = useMemo(
    () => computeVisitDateRange(datePreset, new Date(), customFromYmd, customToYmd, rangeOpts),
    [datePreset, customFromYmd, customToYmd, monthMenuAnchorYmd],
  )
  /** When sorting one column only, keep a fixed server order so changing sort does not reorder every bucket via the API response. */
  const serverSort = useMemo(
    (): VisitKanbanSortKey => (sortScope === 'all' ? sortBy : 'patient_newest'),
    [sortScope, sortBy],
  )
  const { data, isFetching, error, refetch } = useQuery({
    queryKey: [
      'visits',
      'provider',
      getSignedInProviderId(),
      'paged',
      { page: currentPage, pageSize: PAGE_SIZE, search, sort: serverSort, rangeStartIso, rangeEndExclusiveIso },
    ],
    queryFn: async () => {
      const pid = await resolveSignedInProviderId()
      return fetchProviderVisitsPaged(pid, {
        page: currentPage,
        pageSize: PAGE_SIZE,
        search,
        sort: serverSort,
        rangeStartIso,
        rangeEndExclusiveIso,
      })
    },
    placeholderData: keepPreviousData,
    refetchInterval: AUTO_REFRESH_MS,
    refetchIntervalInBackground: false,
  })
  const visits = data?.items ?? []
  const totalVisits = data?.total ?? 0
  const loading = isFetching && !data
  const listError = error ? getApiErrorMessage(error) : null

  useEffect(() => {
    const onFocus = () => {
      const now = Date.now()
      if (now - lastFocusRefetchAtRef.current < MIN_FOCUS_REFRESH_GAP_MS) return
      lastFocusRefetchAtRef.current = now
      void refetch()
    }
    const onVisibility = () => {
      const now = Date.now()
      if (document.visibilityState !== 'visible') return
      if (now - lastFocusRefetchAtRef.current < MIN_FOCUS_REFRESH_GAP_MS) return
      lastFocusRefetchAtRef.current = now
      void refetch()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [refetch])

  const totalPages = Math.max(1, Math.ceil(totalVisits / PAGE_SIZE))

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, serverSort, sortScope, rangeStartIso, rangeEndExclusiveIso])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const openVisitWithTab = (visitId: string, tab: VisitKanbanCardModel['primaryAction']['tab']) => {
    if (!visitId) return
    navigate(`/visits/detail?visitId=${encodeURIComponent(visitId)}&tab=${encodeURIComponent(tab)}`)
  }

  const handleOpenVisit = (card: VisitKanbanCardModel) => {
    if (!card.visitId) return
    openVisitWithTab(card.visitId, 'pre-visit')
  }

  const handlePrimaryAction = (card: VisitKanbanCardModel) => {
    if (!card.visitId) return
    openVisitWithTab(card.visitId, card.primaryAction.tab)
  }

  return (
    <div className="min-h-screen font-manrope text-[#171d16] antialiased">
      <header className="fixed top-0 right-0 z-40 flex h-16 w-[calc(100%-240px)] items-center justify-between border-b border-gray-200 bg-white px-8">
        <div className="flex min-w-0 items-center gap-2">
          <BackButton to="/dashboard" className="-ml-2 shrink-0" />
          <h2 className="truncate text-[28px] font-bold leading-[1.2] tracking-[-0.02em]">All Visits</h2>
        </div>
        <div className="flex shrink-0 items-center gap-6">
          <button
            aria-label="Open notifications"
            className="relative flex items-center text-gray-500 transition-opacity hover:opacity-80"
            onClick={() => setIsNotificationsOpen(true)}
            type="button"
          >
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-[#ba1a1a] ring-2 ring-white" />
          </button>
          <div className="h-8 w-px bg-gray-200" />
          <ProviderHeaderProfileMenu />
        </div>
      </header>

      <main className="min-h-screen px-8 pb-12 pt-20">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <p className="text-sm text-[#3e4a3d]">Manage patient visits and documentation</p>
            <button
              className="shrink-0 self-start rounded-lg bg-[#006b2c] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#005a24] sm:self-auto"
              onClick={() => navigate('/start-visit')}
              type="button"
            >
              New Visit
            </button>
          </div>

          {listError && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              {listError}
            </div>
          )}

          <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
            <div className="relative min-w-0 flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input
                className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by patient name, patient ID, mobile, or visit ID"
                type="text"
                value={searchQuery}
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <div className="relative min-w-[200px] flex-1 sm:max-w-[260px]">
                <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-[18px] text-slate-500">
                  sort
                </span>
                <select
                  aria-label="Sort visits"
                  className="w-full appearance-none cursor-pointer rounded-lg border border-slate-200 bg-white py-2.5 pl-11 pr-10 text-sm font-medium text-[#171d16] shadow-sm hover:bg-slate-50 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as VisitSort)}
                >
                  <option value="patient_newest">New patient: newest first</option>
                  <option value="patient_oldest">New patient: oldest first</option>
                  <option value="visit_latest">Latest visit: newest first</option>
                  <option value="visit_oldest">Latest visit: oldest first</option>
                  <option value="time_newest">Time: newest first</option>
                  <option value="time_oldest">Time: oldest first</option>
                  <option value="name_az">Name: A → Z</option>
                  <option value="name_za">Name: Z → A</option>
                  <option value="visit_id">Visit ID: A → Z</option>
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
                  expand_more
                </span>
              </div>
              <div className="relative min-w-[200px] flex-1 sm:max-w-[280px]">
                <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-[18px] text-slate-500">
                  view_column
                </span>
                <select
                  aria-label="Apply sort to Kanban column"
                  className="w-full appearance-none cursor-pointer rounded-lg border border-slate-200 bg-white py-2.5 pl-11 pr-10 text-sm font-medium text-[#171d16] shadow-sm hover:bg-slate-50 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
                  value={sortScope}
                  onChange={(e) => setSortScope(e.target.value as VisitKanbanSortScope)}
                >
                  <option value="all">Sort: all columns</option>
                  {KANBAN_STAGES.map((col) => (
                    <option key={col.id} value={col.id}>
                      Sort: {col.title} only
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
                  expand_more
                </span>
              </div>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <VisitDateRangeFilter
              customFromYmd={customFromYmd}
              customToYmd={customToYmd}
              onChange={(next) => {
                setDatePreset(next.preset)
                if (next.customFromYmd !== undefined) setCustomFromYmd(next.customFromYmd)
                if (next.customToYmd !== undefined) setCustomToYmd(next.customToYmd)
                if (next.monthMenuAnchorYmd !== undefined) setMonthMenuAnchorYmd(next.monthMenuAnchorYmd)
              }}
              preset={datePreset}
              rangeMonthAnchorYmd={monthMenuAnchorYmd}
            />
          </div>

          <div className="space-y-4">
            {loading && (
              <div className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-500">
                Loading visits…
              </div>
            )}
            {!loading && !listError && totalVisits === 0 && (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center">
                <p className="font-medium text-[#171d16]">No visits to show</p>
                <p className="mt-1 text-sm text-gray-500">
                  Create a visit in the backend or calendar flow, then refresh this page.
                </p>
              </div>
            )}
            {!loading && !listError && totalVisits > 0 && (
              <VisitKanbanBoard
                visits={visits}
                searchQuery={searchQuery}
                sortBy={sortBy}
                sortScope={sortScope}
                onOpenVisit={handleOpenVisit}
                onPrimaryAction={handlePrimaryAction}
              />
            )}
          </div>
          {!loading && !listError && totalVisits > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-sm text-gray-600">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}-
                {Math.min(currentPage * PAGE_SIZE, totalVisits)} of {totalVisits}
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  type="button"
                >
                  Prev
                </button>
                <span className="text-sm text-gray-600">
                  {currentPage} / {totalPages}
                </span>
                <button
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
          )}

      </main>
      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}

export default VisitsPage
