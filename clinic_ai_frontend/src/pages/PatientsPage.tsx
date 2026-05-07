import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useProviderIdentity } from '../hooks/useProviderIdentity'
import { getApiErrorMessage } from '../lib/apiClient'
import { fetchPatientsPaged, type PatientSummary } from '../services/patientsApi'
import NotificationsDrawer from './NotificationsDrawer'

type PatientSort = 'created_newest' | 'created_oldest' | 'visit_latest' | 'visit_oldest' | 'name_az' | 'name_za' | 'id_az'
const PAGE_SIZE = 10

function labelForGender(gender: string | null | undefined): string {
  const g = (gender ?? '').trim().toLowerCase()
  if (g.startsWith('f')) return 'female'
  if (g.startsWith('m')) return 'male'
  return 'person'
}

function toDisplayName(value: string | null | undefined): string {
  const raw = (value || '').trim()
  if (!raw) return 'Patient'
  return raw
    .split(/\s+/)
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}` : ''))
    .join(' ')
}

function PatientsPage() {
  const navigate = useNavigate()
  const provider = useProviderIdentity()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [patientSort, setPatientSort] = useState<PatientSort>('created_newest')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const search = useMemo(() => searchQuery.trim() || undefined, [searchQuery])
  const { data, isFetching, error } = useQuery({
    queryKey: ['patients', 'paged', { page: currentPage, pageSize: PAGE_SIZE, search, sort: patientSort }],
    queryFn: () =>
      fetchPatientsPaged({
        page: currentPage,
        pageSize: PAGE_SIZE,
        search,
        sort: patientSort,
      }),
    placeholderData: keepPreviousData,
  })
  const patients: PatientSummary[] = data?.items ?? []
  const totalPatients = data?.total ?? 0
  const loading = isFetching && !data
  const errorMessage = error ? getApiErrorMessage(error) : null
  const totalPages = Math.max(1, Math.ceil(totalPatients / PAGE_SIZE))

  useEffect(() => {
    setCurrentPage(1)
  }, [patientSort, searchQuery])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  return (
    <div className="text-[#171d16] min-h-screen font-manrope">
      <header className="h-16 sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-md flex items-center justify-end px-8">
        <div className="flex items-center gap-4">
          <div className="h-6 w-px bg-gray-200 mx-2" />
          <button className="hover:bg-slate-100 rounded-full p-2 transition-all relative" onClick={() => setIsNotificationsOpen(true)} type="button">
            <span className="material-symbols-outlined text-slate-600">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold">{provider.displayName}</p>
              <p className="text-[10px] uppercase text-[#3e4a3d]">{provider.title}</p>
            </div>
            <img alt="Dr. Profile" className="h-9 w-9 rounded-full border border-gray-200 object-cover" src={provider.avatarUrl} />
          </div>
        </div>
      </header>

      <main className="p-8 min-h-[calc(100vh-4rem)]">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h2 className="text-[28px] leading-tight tracking-[-0.02em] font-bold text-[#171d16]">Patient Directory</h2>
            <p className="text-slate-500 mt-1">Manage and monitor registered medical profiles.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="shrink-0 rounded-lg bg-[#16a34a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#15803d]"
              onClick={() => navigate('/new-visit')}
              type="button"
            >
              Register New Patient
            </button>
          </div>
        </div>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-[#171d16] placeholder:text-slate-400 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient name"
              type="text"
              value={searchQuery}
            />
          </div>
          <div className="relative min-w-[240px] md:w-[280px]">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-[18px] text-slate-500">
              sort
            </span>
            <select
              aria-label="Sort patients"
              className="w-full appearance-none cursor-pointer rounded-lg border border-slate-200 bg-white py-2.5 pl-11 pr-10 text-sm font-medium text-[#171d16] shadow-sm hover:bg-slate-50 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              value={patientSort}
              onChange={(e) => setPatientSort(e.target.value as PatientSort)}
            >
              <option value="created_newest">New patient: newest first</option>
              <option value="created_oldest">New patient: oldest first</option>
              <option value="visit_latest">Last visit: newest first</option>
              <option value="visit_oldest">Last visit: oldest first</option>
              <option value="name_az">Name: A → Z</option>
              <option value="name_za">Name: Z → A</option>
              <option value="id_az">Patient ID: A → Z</option>
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
              expand_more
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMessage}
          </div>
        )}
        <div className="bg-white rounded-xl border border-[#bdcaba] overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-[#bdcaba]">
                <th className="px-6 py-4 text-[13px] tracking-[0.05em] font-bold text-[#3e4a3d] uppercase">Patient Name</th>
                <th className="px-6 py-4 text-[13px] tracking-[0.05em] font-bold text-[#3e4a3d] uppercase">Patient ID</th>
                <th className="px-6 py-4 text-[13px] tracking-[0.05em] font-bold text-[#3e4a3d] uppercase">Gender / Age</th>
                <th className="px-6 py-4 text-[13px] tracking-[0.05em] font-bold text-[#3e4a3d] uppercase">Mobile Number</th>
                <th className="px-6 py-4 text-[13px] tracking-[0.05em] font-bold text-[#3e4a3d] uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#bdcaba]">
              {patients.map((patient) => (
                <tr
                  key={patient.id}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/patients/detail?patientId=${encodeURIComponent(patient.id)}`)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-slate-100 text-slate-500">
                        <span className="material-symbols-outlined text-[18px]">person</span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 transition-colors group-hover:text-teal-700">{toDisplayName(patient.full_name)}</p>
                        <span className="inline-flex items-center rounded-full bg-blue-100/50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                          {(patient.gender || 'Unknown').toString()}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-slate-500">...{patient.id.slice(-10)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-slate-400">{labelForGender(patient.gender)}</span>
                      <span className="text-sm text-slate-700">
                        {(patient.gender || 'Unknown').toString()}, {patient.age ?? '—'} yrs
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600">{patient.phone_number || '—'}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      className="text-slate-400 hover:text-teal-600 transition-colors"
                      onClick={(event) => {
                        event.stopPropagation()
                        navigate(`/patients/detail?patientId=${encodeURIComponent(patient.id)}`)
                      }}
                      type="button"
                    >
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && patients.length === 0 && (
                <tr>
                  <td className="px-6 py-12 text-center text-sm text-slate-500" colSpan={5}>
                    No patients found in backend.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="px-6 py-4 bg-slate-50/50 flex items-center justify-between border-t border-[#bdcaba]">
            <span className="text-sm text-slate-500 font-medium">
              {loading
                ? 'Loading patients...'
                : totalPatients === 0
                  ? 'Showing 0 patient(s)'
                  : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(currentPage * PAGE_SIZE, totalPatients)} of ${totalPatients} patient(s)`}
            </span>
            <div className="flex items-center gap-2">
              <button
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                type="button"
              >
                Prev
              </button>
              <button className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-bold text-white" type="button">
                {currentPage}
              </button>
              <button
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                type="button"
              >
                Next
              </button>
              <span className="text-xs text-slate-500">
                / {totalPages}
              </span>
            </div>
          </div>
        </div>

      </main>

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}

export default PatientsPage
