import type { PanelPage } from '../../stores/panel'
import { Icon } from '../../components/Icon'

const labels: Record<PanelPage, { label: string; icon: 'bookmarks' | 'pin' | 'history' }> = {
    bookmarks: { label: 'Bookmarks', icon: 'bookmarks' },
    'pinned-items': { label: 'Pinned items', icon: 'pin' },
    history: { label: 'History', icon: 'history' },
}

export function PanelNavigation({
    page,
    onSelect,
}: {
    page: PanelPage
    onSelect: (page: PanelPage) => void
}) {
    return (
        <nav aria-label="Panel sections" className="bt-tabs">
            {(Object.keys(labels) as PanelPage[]).map((item) => (
                <button
                    className="flex items-center justify-center gap-2"
                    key={item}
                    aria-pressed={page === item}
                    onClick={() => onSelect(item)}>
                    <Icon name={labels[item].icon} />
                    {labels[item].label}
                </button>
            ))}
        </nav>
    )
}
