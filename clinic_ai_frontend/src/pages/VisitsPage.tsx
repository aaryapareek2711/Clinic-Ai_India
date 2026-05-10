import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'

import BackButton from '../components/BackButton'
import { getApiErrorMessage } from '../lib/apiClient'
import { useProviderIdentity } from '../hooks/useProviderIdentity'
import {
  DEFAULT_PROVIDER_ID,
  fetchProviderVisitsPaged,
} from '../services/visitWorkflowApi'
import NotificationsDrawer from './NotificationsDrawer'
import VisitKanbanBoard from './visit/VisitKanbanBoard'
import type { VisitKanbanCardModel } from './visit/visit-kanban-utils'

type VisitSort =
  | 'patient_newest'
  | 'patient_oldest'
  | 'visit_latest'
  | 'visit_oldest'
  | 'time_newest'
  | 'time_oldest'
  | 'name_az'
  | 'name_za'
  | 'visit_id'
const PAGE_SIZE = 10
const AUTO_REFRESH_MS = 30_000
const MIN_FOCUS_REFRESH_GAP_MS = 8_000

function VisitsPage() {
  const navigate = useNavigate()
  const provider = useProviderIdentity()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<VisitSort>('patient_newest')
  const [currentPage, setCurrentPage] = useState(1)
  const lastFocusRefetchAtRef = useRef(0)
  const search = useMemo(() => searchQuery.trim() || undefined, [searchQuery])
  const { data, isFetching, error, refetch } = useQuery({
    queryKey: [
      'visits',
      'provider',
      DEFAULT_PROVIDER_ID,
      'paged',
      { page: currentPage, pageSize: PAGE_SIZE, search, sort: sortBy },
    ],
    queryFn: () =>
      fetchProviderVisitsPaged(DEFAULT_PROVIDER_ID, {
        page: currentPage,
        pageSize: PAGE_SIZE,
        search,
        sort: sortBy,
      }),
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
  }, [searchQuery, sortBy])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const openVisitWithTab = (visitId: string, tab: VisitKanbanCardModel['primaryAction']['tab']) => {
    if (!visitId) return
    navigate(`/visits/detail?visitId=${encodeURIComponent(visitId)}&tab=${encodeURIComponent(tab)}`)
  }

  const handleOpenVisit = (card: VisitKanbanCardModel) => {
    openVisitWithTab(card.visitId, 'pre-visit')
  }

  const handlePrimaryAction = (card: VisitKanbanCardModel) => {
    openVisitWithTab(card.visitId, card.primaryAction.tab)
  }

  return (
    <div className="text-[#171d16] min-h-screen">
      <main className="min-h-screen">
        <header className="fixed top-0 right-0 w-[calc(100%-240px)] h-16 bg-white border-b border-gray-200 flex items-center justify-end px-8 z-10">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <button
                aria-label="Open notifications"
                className="relative text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors"
                onClick={() => setIsNotificationsOpen(true)}
                type="button"
              >
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              </button>
            </div>
            <div className="h-8 w-px bg-gray-200" />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold">{provider.displayName}</p>
                <p className="text-[10px] text-gray-500">{provider.title}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#bdcaba] bg-[#e9f0e5] text-[#3e4a3d]">
                <span className="material-symbols-outlined text-[22px]">account_circle</span>
              </div>
            </div>
          </div>
        </header>

        <div className="pt-24 px-8 pb-12">
          <div className="mb-8 flex items-start gap-2">
            <BackButton to="/dashboard" className="-ml-2 mt-1" />
            <div>
              <h2 className="text-[28px] font-bold">All Visits</h2>
              <p className="text-[#3e4a3d] mt-1">Manage patient visits and documentation</p>
            </div>
          </div>

          {listError && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              {listError}
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center justify-end gap-4 mb-8">
            <button
              className="shrink-0 rounded-lg bg-[#16a34a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#15803d]"
              onClick={() => navigate('/start-visit')}
              type="button"
            >
              New Visit
            </button>
          </div>
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input
                className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by patient name, patient ID, mobile, or visit ID"
                type="text"
                value={searchQuery}
              />
            </div>
            <div className="relative min-w-[220px]">
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
              </select>
              <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
                expand_more
              </span>
            </div>
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

        </div>
      </main>
      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}

export default VisitsPage
