import { useState } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult, type DragUpdate } from "@hello-pangea/dnd";
import { PIPELINE_STAGES, STAGE_CONFIG, getLeadsByStage } from "./lead-utils";
import { LeadCard } from "./LeadCard";

interface PipelineBoardProps {
  leads: any[];
  onSelectLead: (lead: any) => void;
  onMoveStage: (lead: any, stage: string) => void;
  onConvert: (lead: any) => void;
  onLogContact: (lead: any) => void;
}

export function PipelineBoard({ leads, onSelectLead, onMoveStage, onConvert, onLogContact }: PipelineBoardProps) {
  const [draggingOverColumn, setDraggingOverColumn] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragUpdate = (update: DragUpdate) => {
    setDraggingOverColumn(update.destination?.droppableId || null);
  };

  const handleDragEnd = (result: DropResult) => {
    setIsDragging(false);
    setDraggingOverColumn(null);

    const { draggableId, source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    const leadId = parseInt(draggableId, 10);
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const newStage = destination.droppableId;
    onMoveStage(lead, newStage);
  };

  return (
    <DragDropContext onDragStart={handleDragStart} onDragUpdate={handleDragUpdate} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar flex-1 min-h-0">
        {PIPELINE_STAGES.map((stage) => {
          const stageLeads = getLeadsByStage(leads, stage);
          const config = STAGE_CONFIG[stage];
          const isOver = draggingOverColumn === stage;
          return (
            <div
              key={stage}
              className="flex flex-col min-w-[260px] w-[260px] shrink-0"
            >
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className={`h-2 w-2 rounded-full ${config.dotClass}`} />
                <span className={`text-xs font-semibold uppercase tracking-wider ${config.color}`}>
                  {config.label}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {stageLeads.length}
                </span>
              </div>
              <Droppable droppableId={stage}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 rounded-xl border p-2 space-y-2 overflow-y-auto custom-scrollbar transition-all duration-200 ${
                      snapshot.isDraggingOver || isOver
                        ? `${config.bgClass} ${config.borderClass} ring-2 ring-offset-1 ring-offset-background ${config.borderClass.replace("border-", "ring-")}`
                        : "border-border/50 bg-muted/30 dark:bg-[hsl(220,20%,9%)]"
                    }`}
                  >
                    {stageLeads.length === 0 && !snapshot.isDraggingOver ? (
                      <div className={`flex items-center justify-center h-20 text-xs ${
                        isDragging ? `${config.color} opacity-60` : "text-muted-foreground/50"
                      }`}>
                        {isDragging ? "Drop here" : "No leads"}
                      </div>
                    ) : stageLeads.length === 0 && snapshot.isDraggingOver ? (
                      <div className={`flex items-center justify-center h-20 text-xs ${config.color}`}>
                        Drop here
                      </div>
                    ) : (
                      stageLeads.map((lead, i) => (
                        <Draggable key={lead.id} draggableId={String(lead.id)} index={i}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              style={{
                                ...dragProvided.draggableProps.style,
                              }}
                              className={`transition-shadow duration-200 ${
                                dragSnapshot.isDragging
                                  ? "shadow-xl shadow-black/20 dark:shadow-black/50 rounded-xl opacity-95 rotate-[1deg] scale-[1.02]"
                                  : ""
                              }`}
                            >
                              <LeadCard
                                lead={lead}
                                index={i}
                                onSelect={onSelectLead}
                                onMoveStage={onMoveStage}
                                onConvert={onConvert}
                                onLogContact={onLogContact}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
