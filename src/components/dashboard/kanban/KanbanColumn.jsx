import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Badge } from '@/components/ui/badge';

export default function KanbanColumn({ columnId, title, tasks, icon: Icon, color, children }) {
  return (
    <div className="flex-shrink-0 w-80">
      <div className="bg-horizon-card/50 rounded-lg border border-horizon">
        {/* כותרת העמודה */}
        <div className={`p-4 border-b border-horizon flex items-center justify-between ${color}`}>
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            <h3 className="font-bold text-base">{title}</h3>
          </div>
          <Badge className="bg-white/20 text-white">
            {tasks.length}
          </Badge>
        </div>

        {/* תוכן העמודה */}
        <Droppable droppableId={columnId}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`p-3 space-y-3 min-h-[500px] max-h-[calc(100vh-300px)] overflow-y-auto transition-colors ${
                snapshot.isDraggingOver ? 'bg-horizon-primary/5 border-2 border-dashed border-horizon-primary' : ''
              }`}
            >
              {children}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
}