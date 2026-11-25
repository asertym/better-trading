import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { preferences } from '../../lib/preferences'
import { useItemTrends } from './useItemTrends'
import { trendVariantLabel } from './variantLabel'
import { TrendRow } from './TrendRow'

export function ItemTrends() {
    const { enabled, search, prices } = useItemTrends()
    const [pinned, setPinned] = useState(() => preferences.getItem('bt-trends-pinned') === 'true')
    const hasVariants = prices.some((price) => Boolean(trendVariantLabel(price)))
    if (!enabled || !search || !prices.length) return null
    return (
        <details className="bt-unique-trends" key={search.key} open={pinned}>
            <summary className="flex justify-between items-center">
                <div className="flex gap-2 items-center">
                    <Icon name="chevron" className="size-6!" />
                    <span className="bt-trends-name">{search.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="bt-trends-source">poe.ninja</span>
                    <button
                        type="button"
                        className="bt-trends-pin"
                        aria-pressed={pinned}
                        title={
                            pinned
                                ? 'Unpin: panel starts closed on each search'
                                : 'Pin: panel stays open on each search'
                        }
                        onClick={(event) => {
                            event.preventDefault()
                            const next = !pinned
                            setPinned(next)
                            preferences.setItem('bt-trends-pinned', String(next))
                        }}>
                        <Icon name={pinned ? 'pin' : 'pinDisabled'} />
                    </button>
                </div>
            </summary>
            <ul>
                {prices.map((price) => (
                    <TrendRow
                        key={`${price.category}/${price.detailsId}`}
                        price={price}
                        prices={prices}
                        version={search.version}
                        league={search.league}
                        hasVariants={hasVariants}
                    />
                ))}
            </ul>
        </details>
    )
}
