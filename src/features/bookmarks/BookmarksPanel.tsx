import { FeatureBoundary } from '../../components/FeatureBoundary'
import { useLiveSearchTargets } from '../liveSearch/useLiveSearchTargets'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Icon } from '../../components/Icon'
import { DndProvider, SortableGroup, SortableItem } from '../../components/Sortable'
import { FOLDER_DATA } from '../../components/sortableCollision'
import { currentLocation } from '../../integrations/poe-trade/location'
import { getFolders, saveFolders, removeFolder, type Folder } from '../../lib/bookmarks/storage'
import { bookmarkQueryKeys } from '../../lib/bookmarks/queryKeys'
import { DragPreview } from './components/DragPreview'
import { FolderEditorDialog } from './components/FolderEditorDialog'
import { FolderView } from './components/FolderView'
import { useBookmarkDnd, useServerTrades } from './hooks/useBookmarkDnd'
import { useExpandedFolders } from './hooks/useExpandedFolders'
import { useBookmarkLeague } from './hooks/useBookmarkLeague'

export function BookmarksPanel() {
    const league = useBookmarkLeague()
    useLiveSearchTargets(true)
    const client = useQueryClient()
    const folders = useQuery({ queryKey: bookmarkQueryKeys.folders(), queryFn: getFolders })
    const [archived, setArchived] = useState(false)
    const [editing, setEditing] = useState<Folder | null>(null)
    const { expanded, setExpanded: expand, toggle } = useExpandedFolders()

    const { version } = currentLocation()
    const visible = (folder: Folder) =>
        folder.version === version && Boolean(folder.archivedAt) === archived
    const serverFolders = folders.data ?? []
    // Trades for every visible folder, so a drag can be routed between folders.
    const serverTrades = useServerTrades(serverFolders.filter(visible))
    // All drag state (folder/trade reordering, live cross-folder moves, persistence).
    const dnd = useBookmarkDnd({ folders: serverFolders, visible, expanded, serverTrades })

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

    const toggleArchive = (folder: Folder) =>
        mutation.mutate([
            ...dnd.folders.filter((item) => item.id !== folder.id),
            {
                ...folder,
                archivedAt: folder.archivedAt ? null : new Date().toISOString(),
            },
        ])
    const saveEditing = () => {
        if (!editing) return
        const exists = dnd.folders.some((folder) => folder.id === editing.id)
        mutation.mutate(
            exists
                ? dnd.folders.map((folder) => (folder.id === editing.id ? editing : folder))
                : [...dnd.folders, editing],
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
            <div className="bt-bookmark-toolbar flex">
                <button className="bt-button w-full" onClick={() => expand([])}>
                    <Icon name="collapse" /> Collapse all
                </button>
                <button className="bt-button w-full" onClick={() => setArchived(!archived)}>
                    <Icon name={archived ? 'undo' : 'archive'} />{' '}
                    {archived ? 'Show active' : 'Show archived'}
                </button>
            </div>
            {folders.isPending && <p role="status">Loading bookmarks…</p>}
            {(folders.error || mutation.error || removeMutation.error || dnd.error) && (
                <p role="alert">Unable to save or load bookmarks.</p>
            )}
            <div className="bt-folder-list">
                <DndProvider {...dnd.provider} overlay={<DragPreview item={dnd.overlayItem} />}>
                    <SortableGroup ids={dnd.visibleFolders.map((folder) => folder.id)}>
                        {dnd.visibleFolders.map((folder) => (
                            <SortableItem
                                id={folder.id}
                                key={folder.id}
                                data={FOLDER_DATA}
                                className="bt-folder-wrapper">
                                <FeatureBoundary name="Bookmark folder">
                                    <FolderView
                                        isDropTarget={folder.id === dnd.dropFolderId}
                                        previewTrades={dnd.trades[folder.id]}
                                        folder={folder}
                                        expanded={expanded.includes(folder.id)}
                                        onToggle={() => toggle(folder.id)}
                                        onEdit={() => setEditing({ ...folder })}
                                        onArchive={() => toggleArchive(folder)}
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
                                version,
                                icon: null,
                                archivedAt: null,
                            })
                        }>
                        <Icon name="new-folder" /> New folder
                    </button>
                </div>
            )}
            {editing && (
                <FolderEditorDialog
                    folder={editing}
                    saving={mutation.isPending}
                    isExisting={dnd.folders.some((folder) => folder.id === editing.id)}
                    onChange={setEditing}
                    onSave={saveEditing}
                    onClose={() => setEditing(null)}
                />
            )}
        </section>
    )
}
