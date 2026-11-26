import { useEffect, useState } from 'react'
import { Icon } from '../../components/Icon'
import { preferences } from '../../lib/preferences'
import { useItemTrends } from './useItemTrends'
import { trendVariantLabel } from './variantLabel'
import { TrendRow } from './TrendRow'

export function ItemTrends() {
    const { enabled, search, prices } = useItemTrends()
    // Pinned sets the default for each new search; open is independent and
    // resets to the pinned value when a new search loads.
    const [pinned, setPinned] = useState(() => preferences.getItem('bt-trends-pinned') !== 'false')
    const [open, setOpen] = useState(pinned)
    useEffect(() => {
        setOpen(pinned)
    }, [search?.key])
    const hasVariants = prices.some((price) => Boolean(trendVariantLabel(price)))
    if (!enabled || !search || !prices.length) return null
    return (
        <details
            className="bt-unique-trends"
            key={search.key}
            open={open}
            onToggle={(event) => setOpen(event.currentTarget.open)}>
            <summary className="flex justify-between items-center w-full gap-2 cursor-pointer  bg-blue-950 text-blue-50 whitespace-nowrap overflow-hidden">
                <div className="flex justify-between w-full items-center px-2 py-1.5 gap-2">
                    <div className="flex gap-2 items-center">
                        <Icon name="chevron" className={`size-5! ${open ? 'rotate-180' : ''}`} />
                        <span className="bt-trends-name">{search.name}</span>
                    </div>
                </div>
                <div className="flex gap-2 items-center self-stretch">
                    <div className="flex items-center gap-2">
                        <span className="bt-trends-source">poe.ninja</span>
                    </div>
                    <button
                        type="button"
                        className="bt-trends-pin self-stretch hover:bg-blue-900 transition cursor-pointer px-3 items-center justify-center flex"
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
                        <Icon name={pinned ? 'pin' : 'pinDisabled'} className="size-5!" />
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
