import VisitKanbanCard from './VisitKanbanCard'
import type { KanbanStageDefinition, VisitKanbanCardModel } from './visit-kanban-utils'

type VisitKanbanColumnProps = {
  stage: KanbanStageDefinition
  visits: VisitKanbanCardModel[]
  onOpenVisit: (visit: VisitKanbanCardModel) => void
  onPrimaryAction: (visit: VisitKanbanCardModel) => void
}

export default function VisitKanbanColumn({ stage, visits, onOpenVisit, onPrimaryAction }: VisitKanbanColumnProps) {
  return (
    <section className="min-w-[280px] max-w-[320px] shrink-0 rounded-2xl border border-[#dbe6d6] bg-[#f7fbf4] p-3">
      <header className="mb-3 border-b border-[#dbe6d6] pb-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[#171d16]">{stage.title}</h3>
          <span className="inline-flex min-w-7 items-center justify-center rounded-full border border-[#006b2c]/25 bg-[#006b2c]/10 px-2 py-0.5 text-xs font-extrabold text-[#006b2c] shadow-sm">
            {visits.length}
          </span>
        </div>
        <p className="mt-1 text-xs text-[#5f6c5d]">{stage.helper}</p>
      </header>

      <div className="space-y-3">
        {visits.length === 0 && (
          <div className="rounded-lg border border-dashed border-[#cedac8] bg-white px-3 py-6 text-center text-xs text-[#6f7b6d]">
            No visits in this stage
          </div>
        )}
        {visits.map((visit) => (
          <VisitKanbanCard key={visit.visitId || `${stage.id}-${visit.patientName}`} visit={visit} onOpen={onOpenVisit} onPrimaryAction={onPrimaryAction} />
        ))}
      </div>
    </section>
  )
}
