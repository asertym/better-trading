// @vitest-environment jsdom
import { QueryClient } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
vi.mock('../../src/lib/bookmarks/storage', () => ({ getFolders: vi.fn(), getTrades: vi.fn() }))
vi.mock('../../src/lib/history', () => ({ recordCurrentSearch: vi.fn() }))
import { getFolders, getTrades } from '../../src/lib/bookmarks/storage'
import { recordCurrentSearch } from '../../src/lib/history'
import { startPageController } from '../../src/lib/pageController'
afterEach(() => vi.restoreAllMocks())
it('uses healthy bookmark titles when history and another folder fail', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    window.history.replaceState({}, '', '/trade/search/Standard/abc')
    document.title = 'Trade'
    vi.mocked(recordCurrentSearch).mockRejectedValue(new Error('Storage unavailable'))
    vi.mocked(getFolders).mockResolvedValue([
        { id: 'bad', title: 'Bad', version: '1', icon: null, archivedAt: null },
        { id: 'good', title: 'Good', version: '1', icon: null, archivedAt: null },
    ])
    vi.mocked(getTrades).mockImplementation(async (id) => {
        if (id === 'bad') throw new Error('Malformed folder')
        return [
            {
                id: 'trade',
                title: 'Healthy search',
                completedAt: null,
                location: { version: '1', type: 'search', slug: 'abc' },
            },
        ]
    })
    const client = new QueryClient()
    const stop = startPageController(client)
    try {
        await vi.waitFor(() => expect(document.title).toBe('Healthy search - Trade'))
    } finally {
        stop()
        client.clear()
    }
})
const calls = () => vi.mocked(recordCurrentSearch).mock.calls.length
async function startController() {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    window.history.replaceState({}, '', '/trade/search/Standard/a')
    document.title = 'Trade'
    vi.mocked(recordCurrentSearch).mockResolvedValue(true)
    vi.mocked(getFolders).mockResolvedValue([])
    const client = new QueryClient()
    const stop = startPageController(client)
    return {
        stop: () => {
            stop()
            client.clear()
        },
    }
}
it('records a submitted search even when the slug does not change', async () => {
    const before = calls()
    const controller = await startController()
    try {
        await vi.waitFor(() => expect(calls()).toBe(before + 1))
        // Typing filters rewrites the slug without any submission.
        window.history.replaceState({}, '', '/trade/search/Standard/b')
        await new Promise((resolve) => setTimeout(resolve, 800))
        expect(calls()).toBe(before + 1)
        // Clicking Search does not change the URL: the slug already holds it.
        const button = document.createElement('button')
        button.className = 'search-btn'
        document.body.append(button)
        button.click()
        await vi.waitFor(() => expect(calls()).toBe(before + 2))
    } finally {
        controller.stop()
    }
})
it('does not record filter-only URL changes', async () => {
    const before = calls()
    const controller = await startController()
    try {
        await vi.waitFor(() => expect(calls()).toBe(before + 1))
        window.history.replaceState({}, '', '/trade/search/Standard/b')
        await new Promise((resolve) => setTimeout(resolve, 800))
        expect(calls()).toBe(before + 1)
    } finally {
        controller.stop()
    }
})
it('records when the search button is clicked', async () => {
    const before = calls()
    const controller = await startController()
    try {
        await vi.waitFor(() => expect(calls()).toBe(before + 1))
        const button = document.createElement('button')
        button.className = 'search-btn'
        document.body.append(button)
        button.click()
        window.history.replaceState({}, '', '/trade/search/Standard/b')
        await vi.waitFor(() => expect(calls()).toBe(before + 2))
    } finally {
        controller.stop()
    }
})
