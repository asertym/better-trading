import { createContext, useContext, type ReactNode } from 'react'
import {
    closestCenter,
    DndContext,
    DragOverlay,
    KeyboardSensor,
    MeasuringStrategy,
    PointerSensor,
    useSensor,
    useSensors,
    type CollisionDetection,
    type DragCancelEvent,
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
import type { SortableData } from './sortableCollision'

// Lock dragging to the vertical axis so an item can't be dragged sideways and
// overflow the panel (both folders and trades are single-column lists).
const restrictToVerticalAxis: Modifier = ({ transform }) => ({
    ...transform,
    x: 0,
})

// Items below a moved row shift without resizing, so the default strategy (measure once
// at drag start) leaves stale rects after a cross-folder move.
const MEASURING = { droppable: { strategy: MeasuringStrategy.Always } }

const Handle = createContext<ReturnType<typeof useSortable> | null>(null)
// The single shared drag-and-drop context for the bookmarks panel. It owns the
// sensors and collision detection; the parent supplies the drag handlers so it can route
// folder reorders and (cross-folder) trade moves through one place. `overlay` is what
// follows the cursor; the in-flow item just dims, so it can't be clipped by a
// collapsing folder or lose its transform when it is re-parented mid-drag.
export function DndProvider({
    onDragEnd,
    onDragStart,
    onDragOver,
    onDragCancel,
    collisionDetection = closestCenter,
    overlay,
    children,
}: {
    onDragEnd: (event: DragEndEvent) => void
    onDragStart?: (event: DragStartEvent) => void
    onDragOver?: (event: DragOverEvent) => void
    onDragCancel?: (event: DragCancelEvent) => void
    collisionDetection?: CollisionDetection
    overlay?: ReactNode
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
            measuring={MEASURING}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDragCancel={onDragCancel}>
            {children}
            <DragOverlay>{overlay}</DragOverlay>
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
    data,
    children,
    className = '',
}: {
    id: string
    /** Exposed to collision detection and drag handlers as `active.data.current`. */
    data?: SortableData
    children: ReactNode
    className?: string
}) {
    const sortable = useSortable({ id, data })
    return (
        <Handle.Provider value={sortable}>
            <div
                ref={sortable.setNodeRef}
                className={`${className} bt-sortable ${sortable.isDragging ? 'is-placeholder' : ''}`}
                style={{
                    transform: CSS.Translate.toString(sortable.transform),
                    transition: sortable.transition,
                    position: 'relative',
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
