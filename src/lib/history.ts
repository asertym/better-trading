import { currentLocation } from '../integrations/poe-trade/location'
import { recommendTitle } from '../integrations/poe-trade/searchPanel'
import { searchTitle } from '../integrations/poe-trade/searchQuery'
import { getValue, setValue } from './storage'

export interface HistoryEntry {
    id: string
    version: '1' | '2'
    type: string
    league: string
    slug: string
    title: string
    createdAt: string
}

export async function getHistory() {
    return ((await getValue<HistoryEntry[]>('trade-history')) ?? []).map((entry) => ({
        ...entry,
        version: entry.version ?? '1',
    }))
}

export async function recordCurrentSearch() {
    const context = currentLocation()
    if (context.type !== 'search' || !context.slug || !context.league) return false
    const history = await getHistory()
    const alreadyCurrent =
        history[0] &&
        ['version', 'type', 'league', 'slug'].every(
            (key) => history[0][key as keyof HistoryEntry] === context[key as keyof typeof context]
        )
    if (alreadyCurrent) return false
    const title = (await searchTitle(context.slug, context.version)) || recommendTitle()
    await setValue(
        'trade-history',
        [
            {
                ...context,
                id: crypto.randomUUID(),
                title,
                createdAt: new Date().toISOString(),
            },
            ...history,
        ].slice(0, 50)
    )
    return true
}
