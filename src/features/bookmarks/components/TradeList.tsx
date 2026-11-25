import { bookmarkUrl } from '../../../integrations/poe-trade/navigation'
import { setPendingBookmarkTrade } from '../../../lib/results/pageCapture'
import { BookmarkLiveAction } from '../../liveSearch/BookmarkLiveAction'
import { DragHandle, SortableItem, SortableGroup } from '../../../components/Sortable'
import type { SortableData } from '../../../components/sortableCollision'
import { Icon } from '../../../components/Icon'
import { Menu } from './Menu'
import { hideBookmarkPricesId, useSettingsStore } from '../../../stores/settings'
import { type Trade } from '../../../lib/bookmarks/storage'

// The visible content of a trade row. Shared with the drag overlay so the dragged
// preview matches the row exactly.
export function TradeLabel({ trade, invalid = false }: { trade: Trade; invalid?: boolean }) {
    const hidePrices = useSettingsStore((s) => s.disabled.includes(hideBookmarkPricesId))
    return (
        <>
            {trade.completedAt && (
                <span className="bt-completed" aria-label="Completed">
                    ✓{' '}
                </span>
            )}
            {trade.title}
            {!hidePrices && trade.lastObservedPrice && (
                <span
                    className="flex items-center gap-2 bt-trade-price"
                    title="Last observed price">
                    {' '}
                    {trade.lastObservedPrice.amount}
                    {trade.lastObservedPrice.icon ? (
                        <img
                            src={trade.lastObservedPrice.icon}
                            alt={trade.lastObservedPrice.currency}
                        />
                    ) : (
                        <small>{trade.lastObservedPrice.currency}</small>
                    )}
                </span>
            )}
            {invalid && <small className="bt-invalid-link"> — Link unavailable</small>}
        </>
    )
}

export function TradeList({
    folderId,
    trades,
    onComplete,
    onEdit,
    onCopy,
    onLocation,
    onMoveUp,
    onDelete,
}: {
    folderId: string
    trades: Trade[]
    onComplete: (trade: Trade) => void
    onEdit: (trade: Trade) => void
    onCopy: (trade: Trade) => void
    onLocation: (trade: Trade) => void
    onMoveUp: (trade: Trade) => void
    onDelete: (trade: Trade) => void
}) {
    return (
        <SortableGroup ids={trades.map((trade) => trade.id)}>
            {trades.map((trade) => {
                const url = bookmarkUrl(trade)
                const data: SortableData = { kind: 'trade', folderId }
                return (
                    <SortableItem key={trade.id} id={trade.id} data={data} className="bt-trade-row">
                        <a
                            className="flex flex-1 justify-between gap-4 underline"
                            href={url}
                            draggable={false}
                            aria-disabled={!url}
                            onClick={() => url && setPendingBookmarkTrade(trade.id)}>
                            <TradeLabel trade={trade} invalid={!url} />
                        </a>
                        <Menu label={'Actions for ' + trade.title}>
                            <button onClick={() => onComplete(trade)}>
                                {trade.completedAt ? 'Uncomplete trade' : 'Complete trade'}
                            </button>
                            <button onClick={() => onEdit(trade)}>Rename</button>
                            <button disabled={!url} onClick={() => onCopy(trade)}>
                                Copy trade URL
                            </button>
                            {trade.location.type === 'search' && (
                                <>
                                    <a
                                        aria-disabled={!bookmarkUrl(trade, { live: true })}
                                        href={bookmarkUrl(trade, { live: true })}>
                                        Open live search
                                    </a>
                                    <BookmarkLiveAction trades={[trade]} />
                                </>
                            )}
                            <button onClick={() => onLocation(trade)}>Update trade location</button>
                            <button onClick={() => onMoveUp(trade)}>Move up</button>
                            <button onClick={() => onDelete(trade)}>Delete trade</button>
                        </Menu>
                        <DragHandle label={'Drag ' + trade.title + ' to move'}>
                            <Icon name="sort" />
                        </DragHandle>
                    </SortableItem>
                )
            })}
        </SortableGroup>
    )
}
