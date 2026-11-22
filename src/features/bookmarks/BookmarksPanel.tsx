import { FeatureBoundary } from '../../components/FeatureBoundary'
import { useLiveSearchTargets } from '../liveSearch/useLiveSearchTargets'
import { useEffect, useRef, useState } from 'react'
import {
    useMutation,
    useQueries,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'
import { Icon } from '../../components/Icon'
import {
    closestCenter,
    type CollisionDetection,
    type DragEndEvent,
    type DragOverEvent,
    type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { DndProvider, SortableGroup, SortableItem } from '../../components/Sortable'
import { currentLocation } from '../../integrations/poe-trade/location'
import {
    getFolders,
    getTrades,
    saveFolders,
    saveTrades,
    removeFolder,
    type Folder,
    type Trade,
} from '../../lib/bookmarks/storage'
import { bookmarkQueryKeys } from '../../lib/bookmarks/queryKeys'
import { BackupControls } from './BackupControls'
import { moveTrade } from './bookmarkUtils'
import { FolderEditorDialog } from './components/FolderEditorDialog'
import { FolderView } from './components/FolderView'
import { useExpandedFolders } from './hooks/useExpandedFolders'
import { useBookmarkLeague } from './hooks/useBookmarkLeague'

export function BookmarksPanel() {
    const league = useBookmarkLeague()
    useLiveSearchTargets(true)
    const client = useQueryClient()
    const folders = useQuery({ queryKey: bookmarkQueryKeys.folders(), queryFn: getFolders })
    // Folder order is a local visual source of truth, kept in sync with the
    // cache except during a drag. dnd-kit clears its transforms synchronously on
    // drop, but React Query's setQueryData re-renders a tick late (its notify
    // manager queues a microtask), so driving order from the cache makes folders
    // jump on release. The reorder is committed to local state and the cache
    // together in handleDragEnd; mid-drag visuals are handled by dnd-kit's
    // transforms.
    const [displayFolders, setDisplayFolders] = useState<Folder[]>(() => folders.data ?? [])
    const isDraggingRef = useRef(false)
    useEffect(() => {
        if (isDraggingRef.current) return
        setDisplayFolders(folders.data ?? [])
    }, [folders.data])
    // Drop-target highlight: which folder a dragged trade is over, and whether
    // the active item is a trade (folders never drop onto folders).
    const [activeIsTrade, setActiveIsTrade] = useState(false)
    const [overFolderId, setOverFolderId] = useState<string | null>(null)
    const [archived, setArchived] = useState(false)
    const [importing, setImporting] = useState(false)
    const [editing, setEditing] = useState<Folder | null>(null)
    const { expanded, setExpanded: expand, toggle } = useExpandedFolders()
    const mutation = useMutation({
        mutationFn: saveFolders,
        onMutate: async (items) => {
            await client.cancelQueries({ queryKey: bookmarkQueryKeys.folders() })
            client.setQueryData(bookmarkQueryKeys.folders(), items)
        },
        onError: () => client.invalidateQueries({ queryKey: bookmarkQueryKeys.folders() }),
        onSuccess: () => client.invalidateQueries({ queryKey: bookmarkQueryKeys.all }),
    })
    const removeMutation = useMutation({
        mutationFn: removeFolder,
        onSettled: () => client.invalidateQueries({ queryKey: bookmarkQueryKeys.all }),
    })
    const reorderMutation = useMutation({
        mutationFn: saveFolders,
        meta: { silentSuccess: true },
        onSettled: () => client.invalidateQueries({ queryKey: bookmarkQueryKeys.folders() }),
    })
    const allFolders = displayFolders
    const visibleFolders = allFolders.filter(
        (folder) =>
            folder.version === currentLocation().version && Boolean(folder.archivedAt) === archived
    )
    // Trades for every visible folder, so a drag can be routed between folders.
    // Shares the same query keys as each FolderView, so React Query dedupes.
    const tradesQueries = useQueries({
        queries: visibleFolders.map((folder) => ({
            queryKey: bookmarkQueryKeys.trades(folder.id),
            queryFn: () => getTrades(folder.id),
        })),
    })
    const tradesByFolder: Record<string, Trade[]> = {}
    visibleFolders.forEach((folder, i) => {
        const data = tradesQueries[i].data
        if (data) tradesByFolder[folder.id] = data
    })
    const folderIds = visibleFolders.map((folder) => folder.id)
    // A folder only competes with other folders for the drop target, so folder
    // reordering doesn't snap against the trade rows inside it.
    const collisionDetection: CollisionDetection = (args) => {
        if (folderIds.includes(String(args.active.id))) {
            return closestCenter({
                ...args,
                droppableContainers: args.droppableContainers.filter((droppable) =>
                    folderIds.includes(String(droppable.id)),
                ),
            })
        }
        return closestCenter(args)
    }
    const findTrade = (tradeId: string) => {
        for (const [folder, trades] of Object.entries(tradesByFolder)) {
            const index = trades.findIndex((trade) => trade.id === tradeId)
            if (index >= 0) return { folder, index }
        }
        return null
    }
    const handleDragStart = ({ active }: DragStartEvent) => {
        isDraggingRef.current = true
        setActiveIsTrade(!folderIds.includes(String(active.id)))
    }
    const handleDragOver = ({ over }: DragOverEvent) => {
        if (!over) {
            setOverFolderId(null)
            return
        }
        const overId = String(over.id)
        // Highlight the folder whether the trade is over its header or one of its
        // trades, so the whole folder reads as the drop target.
        const target = folderIds.includes(overId) ? overId : (findTrade(overId)?.folder ?? null)
        setOverFolderId(target)
    }
    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        setActiveIsTrade(false)
        setOverFolderId(null)
        if (!over) return
        const activeId = String(active.id)
        const overId = String(over.id)
        if (activeId === overId) return
        // Folder → folder: reorder the local state synchronously in this handler
        // so the DOM reorders in the same frame dnd-kit clears its transforms — a
        // React Query setQueryData re-render would land a tick late and make
        // folders jump. Doing it here (not during the drag) also keeps the dragged
        // folder's DOM anchor stable, so it stays glued to the cursor.
        if (folderIds.includes(activeId) && folderIds.includes(overId)) {
            const from = displayFolders.findIndex((folder) => folder.id === activeId)
            const to = displayFolders.findIndex((folder) => folder.id === overId)
            if (from < 0 || to < 0) return
            const updated = arrayMove(displayFolders, from, to)
            setDisplayFolders(updated)
            client.setQueryData(bookmarkQueryKeys.folders(), updated)
            reorderMutation.mutate(updated)
            return
        }
        // Trade → (trade | folder): move the trade, possibly across folders.
        const source = findTrade(activeId)
        if (!source) return
        let targetFolder: string
        let toIndex: number
        if (folderIds.includes(overId)) {
            targetFolder = overId // dropped on a folder header → append
            toIndex = (tradesByFolder[overId] ?? []).length
        } else {
            const target = findTrade(overId)
            if (!target) return
            targetFolder = target.folder
            toIndex = target.index
        }
        const next = moveTrade(
            tradesByFolder,
            source.folder,
            targetFolder,
            source.index,
            toIndex,
        )
        const affected =
            source.folder === targetFolder ? [source.folder] : [source.folder, targetFolder]
        for (const folder of affected) {
            client.setQueryData(bookmarkQueryKeys.trades(folder), next[folder])
        }
        // Persist first, then reconcile, so the refetch reads the written data.
        void Promise.all(
            affected.map((folder) => saveTrades(folder, next[folder])),
        ).then(() => client.invalidateQueries({ queryKey: bookmarkQueryKeys.all }))
    }
    const saveEditing = () => {
        if (!editing) return
        const exists = allFolders.some((folder) => folder.id === editing.id)
        mutation.mutate(
            exists
                ? allFolders.map((folder) => (folder.id === editing.id ? editing : folder))
                : [...allFolders, editing],
            {
                onSuccess: () => {
                    expand([...expanded, editing.id])
                    setEditing(null)
                },
            }
        )
    }
    return (
        <section className="bt-bookmarks">
            {league.warning && (
                <p className="bt-league-notice" role="status">
                    {league.warning}
                </p>
            )}
            <div className="bt-bookmark-toolbar">
                <button className="bt-button" onClick={() => expand([])}>
                    <Icon name="collapse" /> Collapse all
                </button>
                <button className="bt-button" onClick={() => setArchived(!archived)}>
                    <Icon name={archived ? 'undo' : 'archive'} />{' '}
                    {archived ? 'Show active' : 'Show archived'}
                </button>
            </div>
            {folders.isPending && <p role="status">Loading bookmarks…</p>}
            {(folders.error || mutation.error || removeMutation.error) && (
                <p role="alert">Unable to save or load bookmarks.</p>
            )}
            <div className="bt-folder-list">
                <DndProvider
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    collisionDetection={collisionDetection}>
                    <SortableGroup ids={folderIds}>
                    {visibleFolders.map((folder) => (
                        <SortableItem id={folder.id} key={folder.id} className="bt-folder-wrapper">
                            <FeatureBoundary name="Bookmark folder">
                                <FolderView
                                    isDropTarget={activeIsTrade && folder.id === overFolderId}
                                    folder={folder}
                                    expanded={expanded.includes(folder.id)}
                                    onToggle={() => toggle(folder.id)}
                                    onEdit={() => setEditing({ ...folder })}
                                    onArchive={() =>
                                        mutation.mutate([
                                            ...allFolders.filter((item) => item.id !== folder.id),
                                            {
                                                ...folder,
                                                archivedAt: folder.archivedAt
                                                    ? null
                                                    : new Date().toISOString(),
                                            },
                                        ])
                                    }
                                    onRemove={() => removeMutation.mutateAsync(folder.id)}
                                />
                            </FeatureBoundary>
                        </SortableItem>
                    ))}
                    </SortableGroup>
                </DndProvider>
            </div>
            {!archived && (
                <div className="bt-folder-create-actions">
                    <button
                        className="bt-button"
                        disabled={!folders.data}
                        onClick={() =>
                            setEditing({
                                id: crypto.randomUUID(),
                                title: '',
                                version: currentLocation().version,
                                icon: null,
                                archivedAt: null,
                            })
                        }>
                        <Icon name="new-folder" /> New folder
                    </button>
                    <button className="bt-button" onClick={() => setImporting(true)}>
                        <Icon name="import-folder" /> Import folder
                    </button>
                </div>
            )}
            {editing && (
                <FolderEditorDialog
                    folder={editing}
                    saving={mutation.isPending}
                    isExisting={allFolders.some((folder) => folder.id === editing.id)}
                    onChange={setEditing}
                    onSave={saveEditing}
                    onClose={() => setEditing(null)}
                />
            )}
            <BackupControls importing={importing} closeImport={() => setImporting(false)} />
        </section>
    )
}
