import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'

import { findCarePrepPatient } from '../data/carePrepPatients'
import NotificationsDrawer from './NotificationsDrawer'

export default function CarePrepIntakeDetailPage() {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const { tokenKey } = useParams<{ tokenKey: string }>()
  const navigate = useNavigate()
  const patient = tokenKey ? findCarePrepPatient(tokenKey) : undefined

  if (!patient || patient.action !== 'review' || !patient.intake) {
    return <Navigate to="/careprep" replace />
  }

  const intake = patient.intake

  return (
    <div className="min-h-screen bg-[#f4fcf0] font-sans text-[#171d16] antialiased">
      <header className="fixed right-0 top-0 z-40 flex h-16 w-[calc(100%-240px)] items-center justify-between border-b border-slate-200 bg-white px-8">
        <div className="flex items-center gap-4">
          <Link className="text-lg font-bold tracking-tight text-slate-900" to="/careprep">
            MedGenie CarePrep
          </Link>
          <div className="mx-2 h-6 w-px bg-slate-200" />
          <div className="flex items-center gap-2 text-slate-500">
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-sm font-medium">Intake Summary</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative hidden lg:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">search</span>
            <input
              className="w-64 rounded-full border border-slate-200 bg-slate-50 py-1.5 pr-4 pl-10 text-sm focus:border-[#006b2c] focus:ring-2 focus:ring-[#006b2c]/30 focus:outline-none"
              placeholder="Search patients..."
              type="text"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              aria-label="Open notifications"
              className="rounded-full p-2 text-slate-500 hover:bg-slate-50"
              onClick={() => setIsNotificationsOpen(true)}
              type="button"
            >
              <span className="material-symbols-outlined">notifications</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 pt-24">
        <div className="mb-8 flex flex-col items-start justify-between gap-6 rounded-xl border border-slate-200 bg-white p-6 md:flex-row md:items-center">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#d9dff5] shadow-sm">
              <img alt="" className="h-full w-full object-cover" src={intake.avatarUrl} />
            </div>
            <div>
              <h2 className="text-[28px] font-bold leading-[1.2] tracking-[-0.02em] text-[#171d16]">{patient.name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-[#404758]">
                {intake.ageSexLine.split(' • ').map((part, i) => (
                  <span key={part} className="flex items-center gap-x-4">
                    {i > 0 ? <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300" /> : null}
                    <span>{part.trim()}</span>
                  </span>
                ))}
                <span className="flex items-center gap-1.5 rounded-full bg-[#ffd9de] px-2.5 py-0.5 text-xs font-bold text-[#8a143c]">
                  <span className="material-symbols-outlined text-[14px]">warning</span>
                  {intake.chiefConcernLabel}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <div className="text-left md:text-right">
              <p className="text-[13px] font-medium uppercase tracking-[0.05em] text-slate-500">Intake Date</p>
              <p className="text-[18px] font-semibold leading-snug text-[#171d16]">{intake.intakeDateLine}</p>
            </div>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#006b2c]">
              {intake.reviewBadge}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                <h3 className="flex items-center gap-2 text-[18px] font-semibold leading-snug text-[#171d16]">
                  <span className="material-symbols-outlined text-[#006b2c]">chat_bubble</span>
                  Intake Q&amp;A Recap
                </h3>
                <button className="text-sm font-semibold text-[#006b2c] hover:underline" type="button">
                  View Full Transcript
                </button>
              </div>
              <div className="space-y-8 p-6">
                {intake.qa.map((item, idx) => (
                  <div key={`${patient.tokenKey}-${idx}`} className="group">
                    <p className="mb-2 text-base font-bold text-slate-900">{item.question}</p>
                    <div className="ml-4 border-l-2 border-slate-100 pl-4 transition-colors group-hover:border-[#006b2c]">
                      <p className="font-body text-base italic leading-relaxed text-[#3e4a3d]">{item.answer}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-[#a72d51]/5 px-6 py-4">
                <h3 className="flex items-center gap-2 text-[18px] font-semibold text-[#a72d51]">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                    health_and_safety
                  </span>
                  Safety Highlights
                </h3>
              </div>
              <div className="space-y-6 p-6">
                <div>
                  <label className="mb-3 block text-[13px] font-medium uppercase tracking-[0.05em] text-slate-500">Allergies</label>
                  <div className="space-y-2">
                    {intake.allergies.map((a) => (
                      <div
                        key={a.name}
                        className={`flex items-center gap-3 rounded-lg border p-3 ${
                          a.severity === 'high'
                            ? 'border-red-100 bg-red-50'
                            : 'border-slate-100 bg-slate-50'
                        }`}
                      >
                        <span className={`material-symbols-outlined text-xl ${a.severity === 'high' ? 'text-[#ba1a1a]' : 'text-slate-400'}`}>
                          {a.severity === 'high' ? 'block' : 'info'}
                        </span>
                        <div>
                          <p className={`text-sm font-bold ${a.severity === 'high' ? 'text-[#ba1a1a]' : 'text-slate-700'}`}>{a.name}</p>
                          <p className={`text-[11px] ${a.severity === 'high' ? 'text-red-700' : 'text-slate-500'}`}>{a.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <hr className="border-slate-100" />
                <div>
                  <label className="mb-3 block text-[13px] font-medium uppercase tracking-[0.05em] text-slate-500">Current Medications</label>
                  <div className="space-y-3">
                    {intake.medications.map((m) => (
                      <div key={m.name} className="flex justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{m.name}</p>
                          <p className="text-[11px] text-slate-500">{m.detail}</p>
                        </div>
                        <span
                          className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${
                            m.badge === 'ACTIVE'
                              ? 'bg-blue-50 text-blue-700'
                              : m.badge === 'OTC'
                                ? 'bg-slate-100 text-slate-500'
                                : 'bg-amber-50 text-amber-800'
                          }`}
                        >
                          {m.badge}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="rounded-xl bg-[#006b2c]/10 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-[#006b2c]">Last Vitals</span>
                      <span className="text-[10px] text-[#006b2c]/70">{intake.vitals.subtitle}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] uppercase text-slate-500">BP</p>
                        <p className="text-sm font-black text-slate-800">{intake.vitals.bp}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-500">Heart Rate</p>
                        <p className="text-sm font-black text-slate-800">{intake.vitals.hr}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 mt-12 flex flex-col items-stretch justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/50 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4 text-slate-500">
            <span className="material-symbols-outlined">history</span>
            <span className="text-sm font-medium">Auto-saved 2 minutes ago</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <button
              className="rounded-lg border border-slate-900 bg-white px-6 py-3 font-bold text-slate-900 hover:bg-slate-50"
              type="button"
            >
              Request More Info
            </button>
            <button
              className="flex items-center gap-2 rounded-lg bg-[#006b2c] px-8 py-3 font-bold text-white transition-all hover:bg-[#00873a] active:scale-95"
              onClick={() => navigate('/visits')}
              type="button"
            >
              <span className="material-symbols-outlined">edit_note</span>
              Prepare Clinical Note
            </button>
          </div>
        </div>
      </main>

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  )
}
