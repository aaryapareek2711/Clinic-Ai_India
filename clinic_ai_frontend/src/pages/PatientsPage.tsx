import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiErrorMessage } from '../lib/apiClient'
import { fetchPatients, type PatientSummary } from '../services/patientsApi'
import NotificationsDrawer from './NotificationsDrawer'

type PatientRow = PatientSummary

type PatientSort = 'visit_latest' | 'visit_oldest' | 'name_az' | 'name_za' | 'id_az'

function visitTimestamp(value: string | null | undefined): number {
  const t = new Date(value ?? '').getTime()
  return Number.isNaN(t) ? 0 : t
}

function sortPatientRows(rows: PatientRow[], sort: PatientSort): PatientRow[] {
  const copy = [...rows]
  copy.sort((a, b) => {
    if (sort === 'visit_latest') return visitTimestamp(b.latest_visit_scheduled_start) - visitTimestamp(a.latest_visit_scheduled_start)
    if (sort === 'visit_oldest') return visitTimestamp(a.latest_visit_scheduled_start) - visitTimestamp(b.latest_visit_scheduled_start)
    if (sort === 'name_az') return (a.full_name || '').localeCompare(b.full_name || '')
    if (sort === 'name_za') return (b.full_name || '').localeCompare(a.full_name || '')
    return (a.id || '').localeCompare(b.id || '')
  })
  return copy
}

function labelForGender(gender: string | null | undefined): string {
  const g = (gender ?? '').trim().toLowerCase()
  if (g.startsWith('f')) return 'female'
  if (g.startsWith('m')) return 'male'
  return 'person'
}

function formatVisitDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function PatientsPage() {
  const navigate = useNavigate()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [patientSort, setPatientSort] = useState<PatientSort>('visit_latest')
  const [patients, setPatients] = useState<PatientSummary[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        if (!cancelled) {
          setLoading(true)
          setError(null)
        }
        const data = await fetchPatients()
        if (!cancelled) setPatients(data)
      } catch (e) {
        if (!cancelled) setError(getApiErrorMessage(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const sortedPatients = useMemo(() => sortPatientRows(patients, patientSort), [patients, patientSort])

  return (
    <div className="text-[#171d16] min-h-screen font-manrope">
      <header className="h-16 sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-md flex items-center justify-between px-8">
        <div className="flex items-center gap-6 w-1/2">
          <div className="relative w-full max-w-md group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-600 transition-colors">search</span>
            <input
              className="w-full bg-slate-50 border border-gray-200 rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none"
              placeholder="Search patients, files, or records..."
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-6 w-px bg-gray-200 mx-2" />
          <button className="hover:bg-slate-100 rounded-full p-2 transition-all relative" onClick={() => setIsNotificationsOpen(true)} type="button">
            <span className="material-symbols-outlined text-slate-600">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>
        </div>
      </header>

      <main className="p-8 min-h-[calc(100vh-4rem)]">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <nav className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-2">
              <span>Clinical Portal</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-teal-600">Patient Directory</span>
            </nav>
            <h2 className="text-[28px] leading-tight tracking-[-0.02em] font-bold text-[#171d16]">Patient Directory</h2>
            <p className="text-slate-500 mt-1">Manage and monitor registered medical profiles.</p>
          </div>
          <div className="relative min-w-[240px]">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-[18px] text-slate-500">
              sort
            </span>
            <select
              aria-label="Sort patients"
              className="w-full appearance-none cursor-pointer rounded-lg border border-slate-200 bg-white py-2.5 pl-11 pr-10 text-sm font-medium text-[#171d16] shadow-sm hover:bg-slate-50 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              value={patientSort}
              onChange={(e) => setPatientSort(e.target.value as PatientSort)}
            >
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

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}
        <div className="bg-white rounded-xl border border-[#bdcaba] overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-[#bdcaba]">
                <th className="px-6 py-4 text-[13px] tracking-[0.05em] font-medium text-[#3e4a3d] uppercase">Patient Name</th>
                <th className="px-6 py-4 text-[13px] tracking-[0.05em] font-medium text-[#3e4a3d] uppercase">Patient ID</th>
                <th className="px-6 py-4 text-[13px] tracking-[0.05em] font-medium text-[#3e4a3d] uppercase">Gender / Age</th>
                <th className="px-6 py-4 text-[13px] tracking-[0.05em] font-medium text-[#3e4a3d] uppercase">Mobile Number</th>
                <th className="px-6 py-4 text-[13px] tracking-[0.05em] font-medium text-[#3e4a3d] uppercase">Last Visit Date</th>
                <th className="px-6 py-4 text-[13px] tracking-[0.05em] font-medium text-[#3e4a3d] uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#bdcaba]">
              {sortedPatients.map((patient) => (
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
                        <p className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors">{patient.full_name || 'Patient'}</p>
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
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-700">{formatVisitDate(patient.latest_visit_scheduled_start)}</span>
                      <span className="text-[11px] text-slate-400">{patient.latest_visit_id ? 'Latest visit linked' : 'No visit yet'}</span>
                    </div>
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
              {!loading && sortedPatients.length === 0 && (
                <tr>
                  <td className="px-6 py-12 text-center text-sm text-slate-500" colSpan={6}>
                    No patients found in backend.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="px-6 py-4 bg-slate-50/50 flex items-center justify-between border-t border-[#bdcaba]">
            <span className="text-sm text-slate-500 font-medium">
              {loading ? 'Loading patients...' : `Showing ${sortedPatients.length} patient(s)`}
            </span>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg border border-slate-200 text-slate-400 opacity-50" disabled type="button">
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button className="w-8 h-8 rounded-lg bg-teal-600 text-white font-bold text-sm" type="button">1</button>
              <button className="p-2 rounded-lg border border-slate-200 hover:bg-white text-slate-600 transition-all" type="button">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

      </main>

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}

export default PatientsPage
