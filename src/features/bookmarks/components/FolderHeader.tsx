import type { ReactNode } from 'react'
import { DragHandle } from '../../../components/Sortable'
import { Icon } from '../../../components/Icon'
import type { Folder } from '../../../lib/bookmarks/storage'
import { iconUrl } from '../bookmarkUtils'
import { Menu } from '@/features/bookmarks/components/Menu'

export function FolderHeader({
    folder,
    expanded,
    onToggle,
    onEdit,
    onArchive,
    onDelete,
    onExport,
    canExport,
    liveAction,
}: {
    folder: Folder
    expanded: boolean
    onToggle: () => void
    onEdit: () => void
    onArchive: () => void
    onDelete: () => void
    onExport: () => void
    canExport: boolean
    liveAction?: ReactNode
}) {
    return (
        <header className="bt-folder-header">
            <button
                className="bt-folder-title"
                aria-expanded={expanded && !folder.archivedAt}
                onClick={onToggle}
                disabled={Boolean(folder.archivedAt)}>
                {folder.icon && <img src={iconUrl(folder.icon)} alt="" />}
                <span>{folder.title}</span>
                {!folder.archivedAt && (
                    <span className={'bt-expansion-arrow ' + (expanded ? 'is-expanded' : '')}>
                        <Icon name="chevron" />
                    </span>
                )}
            </button>
            <Menu label="Folder actions">
                {!folder.archivedAt && (
                    <button onClick={onEdit}>
                        <Icon name="edit" className="size-5! mr-2" />
                        Edit folder
                    </button>
                )}
                {liveAction}
                <button onClick={onArchive}>
                    <Icon name="archive" className="size-5! mr-2" />
                    {folder.archivedAt ? 'Restore folder' : 'Archive folder'}
                </button>
                <button onClick={onDelete}>
                    <Icon name="delete" className="size-5! mr-2" />
                    Delete folder
                </button>
                <button disabled={!canExport} onClick={onExport}>
                    <Icon name="export" className="size-5! mr-2" />
                    Export folder
                </button>
            </Menu>
            <DragHandle label="Drag folder to reorder">
                <Icon name="sort" />
            </DragHandle>
        </header>
    )
}
