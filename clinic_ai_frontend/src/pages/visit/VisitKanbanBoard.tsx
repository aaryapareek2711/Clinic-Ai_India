import type { ProviderVisitListItem } from '../../services/visitWorkflowApi'
import VisitKanbanColumn from './VisitKanbanColumn'
import {
  filterVisitsBySearch,
  groupVisitsByKanbanStage,
  KANBAN_STAGES,
  type VisitKanbanCardModel,
} from './visit-kanban-utils'

type VisitKanbanBoardProps = {
  visits: ProviderVisitListItem[]
  searchQuery: string
  onOpenVisit: (visit: VisitKanbanCardModel) => void
  onPrimaryAction: (visit: VisitKanbanCardModel) => void
}

export default function VisitKanbanBoard({
  visits,
  searchQuery,
  onOpenVisit,
  onPrimaryAction,
}: VisitKanbanBoardProps) {
  const filtered = filterVisitsBySearch(visits, searchQuery)
  const grouped = groupVisitsByKanbanStage(filtered)

  return (
    <div className="overflow-x-auto pb-6">
      <div className="flex min-w-max gap-4">
        {KANBAN_STAGES.map((stage) => (
          <VisitKanbanColumn
            key={stage.id}
            stage={stage}
            visits={grouped[stage.id]}
            onOpenVisit={onOpenVisit}
            onPrimaryAction={onPrimaryAction}
          />
        ))}
      </div>
    </div>
  )
}
