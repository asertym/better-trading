import { reportIntegrationIssue } from '../integrations/diagnostics'
import { subscribePageUpdates } from './page/updates'
import type { QueryClient } from '@tanstack/react-query'
import { currentLocation } from '../integrations/poe-trade/location'
import { watchSearchSubmissions } from '../integrations/poe-trade/searchSubmit'
import { getFolders, getTrades } from './bookmarks/storage'
import { recordCurrentSearch } from './history'
import { recommendTitle } from '../integrations/poe-trade/searchPanel'

export function startPageController(client: QueryClient) {
    let previous = ''
    let stopped = false
    let title = ''
    const baseTitle = document.title.replace(/^\(\d+\) /, '').replace(/^⚡\s*/, '')
    let running = false
    let pending = false
    // A search only counts when the user submits it (Search button or Enter in a
    // search input), navigates back/forward, or loads the page. Filter-only URL
    // changes leave pendingSubmit false and are never recorded. No staleness
    // timer is needed: submissions only fire while the page has focus and run
    // update() immediately, so the flag is consumed in the same cycle.
    let pendingSubmit = true
    let titleTimer: ReturnType<typeof setTimeout> | undefined
    const writeTitle = () => {
        if (stopped || !title) return
        const count = document.title.match(/^\(\d+\) /)?.[0] ?? ''
        const marker = /\/live\/?$/.test(location.pathname) ? '⚡ ' : ''
        if (document.title !== count + marker + title) document.title = count + marker + title
    }
    async function update() {
        if (stopped || !document.hasFocus()) return
        if (running) {
            pending = true
            return
        }
        running = true
        try {
            if (previous !== location.pathname) {
                previous = location.pathname
                void client.invalidateQueries({ queryKey: ['bookmarks'] })
            }
            if (pendingSubmit) {
                pendingSubmit = false
                try {
                    if (await recordCurrentSearch())
                        void client.invalidateQueries({ queryKey: ['history'] })
                } catch {
                    reportIntegrationIssue('history', 'Recording search failed')
                }
            }
            const context = currentLocation()
            const matches = (
                await Promise.all(
                    (
                        await getFolders().catch(() => {
                            reportIntegrationIssue('bookmarks', 'Title folder lookup failed')
                            return []
                        })
                    )
                        .sort(
                            (a, b) => Number(Boolean(a.archivedAt)) - Number(Boolean(b.archivedAt))
                        )
                        .map(async (folder) =>
                            (
                                await getTrades(folder.id).catch(() => {
                                    reportIntegrationIssue('bookmarks', 'Title trade lookup failed')
                                    return []
                                })
                            )
                                .filter(
                                    (trade) =>
                                        trade.location.version === context.version &&
                                        trade.location.type === context.type &&
                                        trade.location.slug === context.slug
                                )
                                .sort((a, b) => a.title.localeCompare(b.title))
                        )
                )
            ).flat()
            const segment = matches[0]?.title || (context.type === 'search' ? recommendTitle() : '')
            if (!stopped) {
                title = (segment ? segment + ' - ' : '') + baseTitle
                writeTitle()
            }
        } finally {
            running = false
            if (pending && !stopped) {
                pending = false
                void update().catch(() => {})
            }
        }
    }
    const unsubscribePage = subscribePageUpdates(({ contextChanged }) => {
        if (contextChanged) void update().catch(() => {})
        if (titleTimer !== undefined) return
        titleTimer = setTimeout(() => {
            titleTimer = undefined
            writeTitle()
        }, 100)
    }, 'Title and history updates')
    const unsubscribeCache = client.getQueryCache().subscribe((event) => {
        if (event.type === 'updated' && event.query.queryKey[0] === 'bookmarks')
            void update().catch(() => {})
    })
    const stopWatchingSubmissions = watchSearchSubmissions(() => {
        pendingSubmit = true
        // Submitting may not change the URL at all (the slug already holds the
        // typed filters), so run the update ourselves instead of waiting for a
        // context change that may never come.
        void update().catch(() => {})
    })
    const onFocus = () => void update().catch(() => {})
    window.addEventListener('focus', onFocus)
    return () => {
        stopped = true
        clearTimeout(titleTimer)
        stopWatchingSubmissions()
        unsubscribePage()
        unsubscribeCache()
        window.removeEventListener('focus', onFocus)
    }
}
