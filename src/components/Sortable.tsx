import { createContext, useContext, type ReactNode } from 'react'
import {
    closestCenter,
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type CollisionDetection,
    type DragEndEvent,
    type DragOverEvent,
    type DragStartEvent,
    type Modifier,
} from '@dnd-kit/core'
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Lock dragging to the vertical axis so an item can't be dragged sideways and
// overflow the panel (both folders and trades are single-column lists).
const restrictToVerticalAxis: Modifier = ({ transform }) => ({
    ...transform,
    x: 0,
})

const Handle = createContext<ReturnType<typeof useSortable> | null>(null)
// The single shared drag-and-drop context for the bookmarks panel. It owns the
// sensors and collision detection; the parent supplies onDragEnd so it can route
// folder reorders and (cross-folder) trade moves through one handler.
export function DndProvider({
    onDragEnd,
    onDragStart,
    onDragOver,
    collisionDetection = closestCenter,
    children,
}: {
    onDragEnd: (event: DragEndEvent) => void
    onDragStart?: (event: DragStartEvent) => void
    onDragOver?: (event: DragOverEvent) => void
    collisionDetection?: CollisionDetection
    children: ReactNode
}) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )
    return (
        <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            modifiers={[restrictToVerticalAxis]}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}>
            {children}
        </DndContext>
    )
}
// A group of sortable items inside the shared context. Folders form one flat
// group; each folder's trades form a nested group so items can move between them.
export function SortableGroup({ ids, children }: { ids: string[]; children: ReactNode }) {
    return (
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {children}
        </SortableContext>
    )
}
export function SortableItem({
    id,
    children,
    className = '',
}: {
    id: string
    children: ReactNode
    className?: string
}) {
    const sortable = useSortable({ id })
    return (
        <Handle.Provider value={sortable}>
            <div
                ref={sortable.setNodeRef}
                className={`${className} bt-sortable ${sortable.isDragging ? 'is-dragging' : ''}`}
                style={{
                    transform: CSS.Translate.toString(sortable.transform),
                    transition: sortable.transition,
                    position: 'relative',
                    zIndex: sortable.isDragging ? 20 : undefined,
                }}>
                {children}
            </div>
        </Handle.Provider>
    )
}
export function DragHandle({ label, children }: { label: string; children: ReactNode }) {
    const sortable = useContext(Handle)
    return (
        <button
            type="button"
            className="bt-drag"
            ref={sortable?.setActivatorNodeRef}
            {...sortable?.attributes}
            {...sortable?.listeners}
            aria-label={label}>
            {children}
        </button>
    )
}
