import {
    closestCenter,
    pointerWithin,
    type CollisionDetection,
    type DroppableContainer,
} from '@dnd-kit/core'

/** Attached to every sortable item via `useSortable({ data })` so collision logic can tell them apart. */
export type SortableData = { kind: 'folder' } | { kind: 'trade'; folderId: string }
export const FOLDER_DATA: SortableData = { kind: 'folder' }

const dataOf = (container: DroppableContainer) => container.data.current as SortableData | undefined
const folderIdOf = (container: DroppableContainer) => {
    const data = dataOf(container)
    return data?.kind === 'trade' ? data.folderId : undefined
}

/**
 * Pointer-first collision detection for the bookmarks panel.
 *
 * `closestCenter` over every droppable makes a trade drag compete with the (tall) folder
 * wrappers and with rows of collapsed folders, so `over` flips between "row" and "folder"
 * and the list snaps. Here the pointer decides, and only visible rows are candidates.
 *
 * `openFolderIds`: folders whose rows are actually visible (expanded and not archived).
 */
export const createBookmarkCollision =
    (openFolderIds: ReadonlySet<string>): CollisionDetection =>
    (args) => {
        const detect = (
            containers: DroppableContainer[],
            strategy: CollisionDetection = pointerWithin
        ) => strategy({ ...args, droppableContainers: containers })
        const folders = args.droppableContainers.filter((c) => dataOf(c)?.kind === 'folder')

        // Folders only compete with other folders.
        if ((args.active.data.current as SortableData | undefined)?.kind === 'folder') {
            const hit = detect(folders)
            return hit.length ? hit : detect(folders, closestCenter)
        }

        // Collapsed folders keep their rows mounted (Collapsible only hides them):
        // those rows must never be drop targets.
        const rows = args.droppableContainers.filter((c) => {
            const folderId = folderIdOf(c)
            return folderId !== undefined && openFolderIds.has(folderId)
        })

        // Pointer is over a row: unambiguous.
        const direct = detect(rows)
        if (direct.length) return direct

        // Pointer is in a gap, on a header, or over an empty/collapsed folder.
        const [folder] = detect(folders)
        if (folder) {
            const siblings = rows.filter((c) => folderIdOf(c) === String(folder.id))
            return siblings.length ? detect(siblings, closestCenter) : [folder]
        }

        // No pointer (keyboard) or pointer outside everything: nearest eligible target.
        const populated = new Set(rows.map(folderIdOf))
        return detect(
            [...rows, ...folders.filter((c) => !populated.has(String(c.id)))],
            closestCenter
        )
    }
