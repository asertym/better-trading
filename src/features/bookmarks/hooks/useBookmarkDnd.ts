import { useRef, useState } from 'react'
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query'
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import {
    getTrades,
    saveFolders,
    saveTrades,
    type Folder,
    type Trade,
} from '../../../lib/bookmarks/storage'
import { bookmarkQueryKeys } from '../../../lib/bookmarks/queryKeys'
import {
    createBookmarkCollision,
    type SortableData,
} from '../../../components/sortableCollision'
import { moveTrade } from '../bookmarkUtils'

export type TradesByFolder = Record<string, Trade[]>
export type ActiveItem = { kind: 'folder'; folder: Folder } | { kind: 'trade'; trade: Trade }

/** Trades for every given folder. Shares query keys with each FolderView, so React Query dedupes. */
export function useServerTrades(folders: Folder[]): TradesByFolder {
    const results = useQueries({
        queries: folders.map((folder) => ({
            queryKey: bookmarkQueryKeys.trades(folder.id),
            queryFn: () => getTrades(folder.id),
        })),
    })
    const out: TradesByFolder = {}
    folders.forEach((folder, i) => {
        const data = results[i].data
        if (data) out[folder.id] = data
    })
    return out
}

/**
 * A local value that shadows server state while a drag or its save is in flight.
 * It is committed synchronously in the drop handler, so it lands in the same render as
 * dnd-kit's transform reset (React Query's cache notification lands a tick later, which
 * made dropped items flash back to their old slot).
 */
function useOverride<T>() {
    const [value, setValue] = useState<T | null>(null)
    const token = useRef(0)
    return {
        value,
        /** Show `next`; drop the override when `until` settles, unless a newer one replaced it. */
        hold: (next: T, until?: Promise<unknown>) => {
            const mine = ++token.current
            setValue(next)
            void until?.finally(() => {
                if (token.current === mine) setValue(null)
            })
        },
        clear: () => {
            token.current++
            setValue(null)
        },
    }
}

const locate = (trades: TradesByFolder, id: string) => {
    for (const [folderId, list] of Object.entries(trades)) {
        const index = list.findIndex((trade) => trade.id === id)
        if (index >= 0) return { folderId, index }
    }
    return null
}

const sameOrder = (a: Trade[] = [], b: Trade[] = []) =>
    a.length === b.length && a.every((trade, i) => trade.id === b[i].id)

/** The trade lists after releasing `activeId` over `overId`, or null if nothing changes. */
export const place = (trades: TradesByFolder, activeId: string, overId: string, below = false) => {
    const from = locate(trades, activeId)
    const target = locate(trades, overId)
    const toFolder = target?.folderId ?? (trades[overId] ? overId : null)
    if (!from || !toFolder || !trades[toFolder]) return null
    const crossing = toFolder !== from.folderId
    const toIndex = target
        ? target.index + (crossing && below ? 1 : 0)
        : trades[toFolder].length // dropped on a folder rather than a row: append
    if (!crossing && toIndex === from.index) return null
    return { ...trades, ...moveTrade(trades, from.folderId, toFolder, from.index, toIndex) }
}

const kindOf = (event: { active: { data: { current?: unknown } } }) =>
    (event.active.data.current as SortableData | undefined)?.kind

/**
 * All drag-and-drop state for the bookmarks panel: folder reordering, trade reordering and
 * live cross-folder trade moves, plus their persistence.
 *
 * `folders` is the server order of every folder; `visible` picks the ones on screen;
 * `expanded` lists expanded folder ids; `serverTrades` is the trade cache per visible folder.
 */
export function useBookmarkDnd({
    folders,
    visible,
    expanded,
    serverTrades,
}: {
    folders: Folder[]
    visible: (folder: Folder) => boolean
    expanded: string[]
    serverTrades: TradesByFolder
}) {
    const client = useQueryClient()
    const folderOverride = useOverride<Folder[]>()
    const tradeOverride = useOverride<TradesByFolder>()
    const [activeId, setActiveId] = useState<string | null>(null)
    const [saveFailed, setSaveFailed] = useState(false)

    const reorder = useMutation({
        mutationFn: saveFolders,
        meta: { silentSuccess: true },
        onSettled: () => client.invalidateQueries({ queryKey: bookmarkQueryKeys.folders() }),
    })

    const allFolders = folderOverride.value ?? folders
    const visibleFolders = allFolders.filter(visible)
    const trades = tradeOverride.value ?? serverTrades
    const folderIds = new Set(visibleFolders.map((folder) => folder.id))
    const openIds = new Set(
        visibleFolders
            .filter((folder) => !folder.archivedAt && expanded.includes(folder.id))
            .map((folder) => folder.id)
    )
    const containerOf = (id: string) =>
        folderIds.has(id) ? id : (locate(trades, id)?.folderId ?? null)

    const commitFolders = (next: Folder[]) => {
        client.setQueryData(bookmarkQueryKeys.folders(), next)
        folderOverride.hold(next, reorder.mutateAsync(next).catch(() => undefined))
    }

    const commitTrades = (final: TradesByFolder) => {
        const changed = Object.keys(final).filter((id) => !sameOrder(final[id], serverTrades[id]))
        if (!changed.length) return tradeOverride.clear()
        for (const id of changed) client.setQueryData(bookmarkQueryKeys.trades(id), final[id])
        // Persist first, then reconcile, so the refetch reads the written data.
        const saved = Promise.all(changed.map((id) => saveTrades(id, final[id])))
            .catch(() => setSaveFailed(true))
            .then(() => client.invalidateQueries({ queryKey: bookmarkQueryKeys.all }))
        tradeOverride.hold(final, saved)
    }

    const onDragStart = ({ active }: DragStartEvent) => {
        setActiveId(String(active.id))
        setSaveFailed(false)
    }

    // Live cross-folder move: the gap opens in the target folder while dragging.
    const onDragOver = (event: DragOverEvent) => {
        if (!event.over || kindOf(event) !== 'trade') return
        const activeKey = String(event.active.id)
        const overKey = String(event.over.id)
        if (containerOf(overKey) === containerOf(activeKey)) return
        const translated = event.active.rect.current.translated
        const below = Boolean(
            translated && translated.top > event.over.rect.top + event.over.rect.height
        )
        const next = place(trades, activeKey, overKey, below)
        if (next) tradeOverride.hold(next)
    }

    const onDragEnd = (event: DragEndEvent) => {
        setActiveId(null)
        if (!event.over) return tradeOverride.clear() // dropped on nothing: revert live moves
        const activeKey = String(event.active.id)
        const overKey = String(event.over.id)

        if (kindOf(event) === 'folder') {
            const from = allFolders.findIndex((folder) => folder.id === activeKey)
            const to = allFolders.findIndex((folder) => folder.id === overKey)
            if (from >= 0 && to >= 0 && from !== to) commitFolders(arrayMove(allFolders, from, to))
            return
        }
        // After live moves the row already sits in the folder under the pointer, so usually
        // only a same-folder reorder (or nothing) is left; persist whatever differs from the server.
        commitTrades(place(trades, activeKey, overKey) ?? trades)
    }

    const onDragCancel = () => {
        setActiveId(null)
        tradeOverride.clear()
    }

    const folder = activeId ? visibleFolders.find((f) => f.id === activeId) : undefined
    const at = activeId && !folder ? locate(trades, activeId) : null
    const overlayItem: ActiveItem | null = folder
        ? { kind: 'folder', folder }
        : at
          ? { kind: 'trade', trade: trades[at.folderId][at.index] }
          : null

    return {
        /** Every folder in display order (includes locally held reorders). */
        folders: allFolders,
        visibleFolders,
        /** Trades per visible folder, including live drag previews. */
        trades,
        overlayItem,
        /** The folder the dragged trade currently sits in reads as the drop target. */
        dropFolderId: activeId && !folderIds.has(activeId) ? containerOf(activeId) : null,
        error: saveFailed || Boolean(reorder.error),
        /** Spread onto <DndProvider>. */
        provider: {
            collisionDetection: createBookmarkCollision(openIds),
            onDragStart,
            onDragOver,
            onDragEnd,
            onDragCancel,
        },
    }
}
