import { Icon } from '../../../components/Icon'
import type { ActiveItem } from '../hooks/useBookmarkDnd'
import { FolderHeader } from './FolderHeader'
import { TradeLabel } from './TradeList'

const noop = () => {}

// What follows the cursor while dragging. It lives inside <DragOverlay>, outside the folder,
// so it mirrors the real row's markup and classes (any CSS scoped to those picks it up) and
// carries `is-dragging`; the in-flow item only dims (`is-placeholder`).
export function DragPreview({ item }: { item: ActiveItem | null }) {
    if (!item) return null
    if (item.kind === 'trade') {
        return (
            <div className="bt-trade-row bt-sortable is-dragging">
                <a className="flex flex-1 justify-between gap-4 underline">
                    <TradeLabel trade={item.trade} />
                </a>
                <span className="bt-menu">
                    <Icon name="options" />
                </span>
                <span className="bt-drag">
                    <Icon name="sort" />
                </span>
            </div>
        )
    }
    // A compact header instead of the whole (possibly very tall) expanded folder.
    return (
        <div className="bt-folder-wrapper bt-sortable is-dragging">
            <div className="bt-folder">
                <FolderHeader
                    folder={item.folder}
                    expanded={false}
                    onToggle={noop}
                    onEdit={noop}
                    onArchive={noop}
                    onDelete={noop}
                    onExport={noop}
                    canExport={false}
                />
            </div>
        </div>
    )
}
