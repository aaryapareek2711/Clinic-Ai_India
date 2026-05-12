import { useCallback, useEffect, useId, useRef, useState } from 'react'

import {
  type VisitDatePresetId,
  computeVisitDateRange,
  formatMenuNavMonthLabel,
  formatRangeHint,
  presetAnchoredToLiveToday,
  presetTriggerTitle,
  startOfMonth,
  ymdFromLocalDate,
  ymdToLocalStart,
} from '../../lib/visitDateRangePresets'

export type VisitDateRangeFilterProps = {
  preset: VisitDatePresetId
  /** First day of month (YYYY-MM-DD) for applied month-relative presets; null otherwise. */
  rangeMonthAnchorYmd: string | null
  customFromYmd: string
  customToYmd: string
  onChange: (next: {
    preset: VisitDatePresetId
    customFromYmd?: string
    customToYmd?: string
    /** YYYY-MM-DD first of month when applying a menu-month-relative preset; null for today / rolling / custom. */
    monthMenuAnchorYmd?: string | null
  }) => void
}

const MENU_SECTIONS: { title: string; presets: VisitDatePresetId[] }[] = [
  { title: 'Recommended', presets: ['today', 'last_7', 'this_month'] },
  { title: 'Relative dates', presets: ['last_7', 'last_30'] },
]

function rowRightHint(
  preset: VisitDatePresetId,
  now: Date,
  customFromYmd: string,
  customToYmd: string,
  menuViewMonth: Date,
): string {
  if (preset === 'custom') return ''
  const opts = { menuMonthStart: menuViewMonth }
  return formatRangeHint(preset, now, customFromYmd, customToYmd, opts)
}

export default function VisitDateRangeFilter({
  preset,
  rangeMonthAnchorYmd,
  customFromYmd,
  customToYmd,
  onChange,
}: VisitDateRangeFilterProps) {
  const menuId = useId()
  const [open, setOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [draftFrom, setDraftFrom] = useState(customFromYmd)
  const [draftTo, setDraftTo] = useState(customToYmd)
  const [customError, setCustomError] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const now = new Date()
  const [menuViewMonth, setMenuViewMonth] = useState(() => startOfMonth(new Date()))

  const appliedMenuMonthStart =
    rangeMonthAnchorYmd != null && rangeMonthAnchorYmd !== ''
      ? ymdToLocalStart(rangeMonthAnchorYmd, now)
      : undefined
  const triggerOpts =
    !presetAnchoredToLiveToday(preset) && appliedMenuMonthStart
      ? { menuMonthStart: appliedMenuMonthStart }
      : undefined
  const { rangeStartIso, rangeEndExclusiveIso } = computeVisitDateRange(preset, now, customFromYmd, customToYmd, triggerOpts)
  const triggerHint = formatRangeHint(preset, now, customFromYmd, customToYmd, triggerOpts)
  const triggerTitle = presetTriggerTitle(preset)

  const startThisCalendarMonth = startOfMonth(now)
  const startNextMenuMonth = new Date(menuViewMonth.getFullYear(), menuViewMonth.getMonth() + 1, 1, 0, 0, 0, 0)
  const canGoNextMonth = startNextMenuMonth.getTime() <= startThisCalendarMonth.getTime()

  useEffect(() => {
    if (open) setMenuViewMonth(startOfMonth(new Date()))
  }, [open])

  const shiftMenuMonth = (delta: number) => {
    setMenuViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1, 0, 0, 0, 0))
  }

  const openCustomModal = useCallback(() => {
    setOpen(false)
    const n = new Date()
    setDraftFrom(customFromYmd || ymdFromLocalDate(n))
    setDraftTo(customToYmd || ymdFromLocalDate(n))
    setCustomError(null)
    setCustomOpen(true)
  }, [customFromYmd, customToYmd])

  useEffect(() => {
    if (!open && !customOpen) return
    const onDoc = (e: MouseEvent) => {
      const el = rootRef.current
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false)
        if (customOpen) setCustomOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, customOpen])

  useEffect(() => {
    if (!open && !customOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setCustomOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, customOpen])

  const selectPreset = (p: VisitDatePresetId) => {
    if (p === 'custom') {
      openCustomModal()
      return
    }
    onChange({
      preset: p,
      monthMenuAnchorYmd: presetAnchoredToLiveToday(p) ? null : ymdFromLocalDate(menuViewMonth),
    })
    setOpen(false)
  }

  const applyCustom = () => {
    if (!draftFrom || !draftTo) {
      setCustomError('Choose a start and end date.')
      return
    }
    setCustomError(null)
    onChange({ preset: 'custom', customFromYmd: draftFrom, customToYmd: draftTo, monthMenuAnchorYmd: null })
    setCustomOpen(false)
  }

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-controls={menuId}
        className="inline-flex min-w-[200px] items-center justify-between gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-left text-sm font-medium text-[#171d16] shadow-sm outline-none transition hover:border-gray-400 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <span className="flex items-center gap-2 truncate">
          <span className="material-symbols-outlined shrink-0 text-[20px] text-slate-500">calendar_month</span>
          <span className="flex min-w-0 flex-col truncate">
            <span className="truncate font-semibold">{triggerTitle}</span>
            <span className="truncate text-xs font-normal text-slate-500">{triggerHint}</span>
          </span>
        </span>
        <span className="material-symbols-outlined shrink-0 text-[20px] text-slate-400">expand_more</span>
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 flex max-h-[min(85vh,420px)] w-[min(100vw-2rem,320px)] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white py-2 shadow-xl"
          id={menuId}
          role="menu"
        >
          <div className="shrink-0 border-b border-gray-100 px-3 pb-2">
            <div className="flex items-center justify-between gap-2">
              <button
                className="rounded px-1 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-100 hover:text-[#171d16]"
                onClick={() => shiftMenuMonth(-1)}
                type="button"
              >
                &lt; Previous
              </button>
              <span className="min-w-0 truncate text-center text-xs font-semibold text-[#171d16]">
                {formatMenuNavMonthLabel(menuViewMonth)}
              </span>
              <button
                className="rounded px-1 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-100 hover:text-[#171d16] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                disabled={!canGoNextMonth}
                onClick={() => canGoNextMonth && shiftMenuMonth(1)}
                type="button"
              >
                Next &gt;
              </button>
            </div>
          </div>

          <div className="max-h-56 min-h-0 overflow-y-auto overscroll-contain py-1">
            {MENU_SECTIONS.map((section) => (
              <div className="px-2 py-2" key={section.title}>
                <p className="px-2 pb-1 text-xs font-bold text-[#171d16]">{section.title}</p>
                <ul className="space-y-0.5">
                  {section.presets.map((p) => (
                    <li key={`${section.title}-${p}`}>
                      <button
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left text-sm text-[#171d16] hover:bg-slate-50"
                        onClick={() => selectPreset(p)}
                        role="menuitem"
                        type="button"
                      >
                        <span className={preset === p ? 'font-semibold text-[#2563eb]' : ''}>{presetTriggerTitle(p)}</span>
                        <span className="shrink-0 text-right text-xs text-slate-500">{rowRightHint(p, now, customFromYmd, customToYmd, menuViewMonth)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="border-t border-gray-100 px-2 py-2">
              <p className="px-2 pb-1 text-xs font-bold text-[#171d16]">Custom</p>
              <button
                className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => selectPreset('custom')}
                role="menuitem"
                type="button"
              >
                <span className={preset === 'custom' ? 'font-semibold text-[#2563eb]' : ''}>Custom date range</span>
                <span className="material-symbols-outlined text-[18px] text-slate-400">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {customOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-4"
          onClick={() => setCustomOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setCustomOpen(false)}
          role="presentation"
        >
          <div
            aria-labelledby="visit-custom-range-title"
            aria-modal="true"
            className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <h2 className="text-lg font-semibold text-[#171d16]" id="visit-custom-range-title">
              Custom date range
            </h2>
            <p className="mt-1 text-sm text-slate-600">Visits are included if they were created, last updated, or scheduled within these days.</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="visit-range-from">
                  From
                </label>
                <input
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
                  id="visit-range-from"
                  onChange={(e) => setDraftFrom(e.target.value)}
                  type="date"
                  value={draftFrom}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="visit-range-to">
                  To
                </label>
                <input
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
                  id="visit-range-to"
                  onChange={(e) => setDraftTo(e.target.value)}
                  type="date"
                  value={draftTo}
                />
              </div>
            </div>

            {customError && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {customError}
              </p>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-[#171d16] hover:bg-slate-50"
                onClick={() => setCustomOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
                onClick={() => applyCustom()}
                type="button"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      <span className="sr-only" data-range-start={rangeStartIso} data-range-end={rangeEndExclusiveIso} />
    </div>
  )
}
