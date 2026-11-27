import { expect, it } from 'vitest'
import { createBookmarkCollision, FOLDER_DATA, type SortableData } from '../../src/components/sortableCollision'
import type { ClientRect } from '@dnd-kit/core'

const rect = (left: number, top: number, width: number, height: number): ClientRect => ({
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
})

// A droppable candidate: its `data` is what the collision logic inspects; `rect` (when set)
// is what pointerWithin / closestCenter measure against.
type Item = { id: string; data: SortableData | undefined; rect?: ClientRect }

const run = (
    open: ReadonlySet<string>,
    activeData: SortableData,
    items: Item[],
    pointer: { x: number; y: number } | null,
    collisionRect?: ClientRect,
) =>
    createBookmarkCollision(open)({
        active: { id: 'active', data: { current: activeData }, rect: { current: { initial: null, translated: null } } },
        collisionRect: collisionRect ?? rect(0, 0, 1, 1),
        droppableRects: new Map(items.filter((i) => i.rect).map((i) => [i.id, i.rect!])),
        droppableContainers: items.map(({ id, data }) => ({
            id,
            key: id,
            data: { current: data },
            disabled: false,
            node: { current: null },
            rect: { current: null },
        })),
        pointerCoordinates: pointer,
    }).map((c) => c.id)

it('a folder drag only competes with other folders', () => {
    const ids = run(
        new Set(['fA']),
        FOLDER_DATA,
        [
            { id: 'fA', data: FOLDER_DATA },
            { id: 'fB', data: FOLDER_DATA, rect: rect(0, 60, 100, 50) },
        ],
        { x: 50, y: 85 },
    )
    expect(ids).toEqual(['fB'])
})

it('a trade drag over a visible row lands on that row', () => {
    const ids = run(
        new Set(['fA']),
        { kind: 'trade', folderId: 'fA' },
        [
            { id: 't1', data: { kind: 'trade', folderId: 'fA' } },
            { id: 't2', data: { kind: 'trade', folderId: 'fA' }, rect: rect(0, 50, 100, 40) },
        ],
        { x: 50, y: 70 },
    )
    expect(ids).toEqual(['t2'])
})

it('a collapsed folder keeps its row mounted but never makes it a drop target', () => {
    const ids = run(
        new Set(['fA']),
        { kind: 'trade', folderId: 'fA' },
        [
            // fB is collapsed (not in open): its row tX must not be a candidate.
            { id: 'fB', data: FOLDER_DATA, rect: rect(0, 50, 100, 100) },
            { id: 'tX', data: { kind: 'trade', folderId: 'fB' } },
        ],
        { x: 50, y: 75 },
    )
    expect(ids).toEqual(['fB'])
})

it('with no pointer (keyboard), the nearest eligible row wins and populated folders drop out', () => {
    const ids = run(
        new Set(['fA']),
        { kind: 'trade', folderId: 'fA' },
        [
            // fA is populated by t1, so it is excluded from the no-pointer fallback.
            { id: 'fA', data: FOLDER_DATA },
            { id: 't1', data: { kind: 'trade', folderId: 'fA' }, rect: rect(0, 0, 100, 30) },
        ],
        null,
        rect(0, 0, 100, 30),
    )
    expect(ids).toEqual(['t1'])
})
