import type { VisitKanbanCardModel } from './visit-kanban-utils'

type VisitKanbanCardProps = {
  visit: VisitKanbanCardModel
  onOpen: (visit: VisitKanbanCardModel) => void
  onPrimaryAction: (visit: VisitKanbanCardModel) => void
}

function appointmentDisplay(raw: string): string {
  const value = (raw || '').trim()
  if (!value) return 'No appointment time'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return value
  return dt.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function flowBadge(flow: VisitKanbanCardModel['flowType']): { label: string; className: string } {
  if (flow === 'walk-in') {
    return {
      label: 'Walk-in',
      className: 'bg-sky-100 text-sky-700 border border-sky-200',
    }
  }
  if (flow === 'scheduled') {
    return {
      label: 'Scheduled',
      className: 'bg-amber-100 text-amber-700 border border-amber-200',
    }
  }
  return {
    label: 'Visit',
    className: 'bg-gray-100 text-gray-700 border border-gray-200',
  }
}

export default function VisitKanbanCard({ visit, onOpen, onPrimaryAction }: VisitKanbanCardProps) {
  const typeBadge = flowBadge(visit.flowType)
  return (
    <article
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#2563eb]"
      onClick={() => onOpen(visit)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(visit)
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-[#171d16]">{visit.patientName}</h4>
          <p className="mt-0.5 text-xs text-gray-500">{visit.meta}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeBadge.className}`}>
          {typeBadge.label}
        </span>
      </div>

      {visit.subtitle ? (
        <p className="mt-2 text-xs font-medium text-[#3e4a3d] line-clamp-1">{visit.subtitle}</p>
      ) : null}
      <p className="mt-1 text-xs text-gray-500">Appt: {appointmentDisplay(visit.scheduledStart)}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {visit.tags.map((tag) => (
          <span
            className="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600"
            key={tag}
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          className="rounded-md bg-[#2563eb] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1d4ed8]"
          onClick={(e) => {
            e.stopPropagation()
            onPrimaryAction(visit)
          }}
          type="button"
        >
          {visit.primaryAction.label}
        </button>
        <button
          className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#171d16] hover:bg-gray-50"
          onClick={(e) => {
            e.stopPropagation()
            onOpen(visit)
          }}
          type="button"
        >
          {visit.visitId ? 'View Visit' : 'Open Patient'}
        </button>
      </div>
    </article>
  )
}
