// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
vi.mock('wxt/browser', () => ({
    browser: { storage: { local: { get: vi.fn(), set: vi.fn(), remove: vi.fn() } } },
}))
vi.mock('../../src/integrations/poe-trade/searchQuery', () => ({
    searchTitle: vi.fn(),
}))
import { browser } from 'wxt/browser'
import { searchTitle } from '../../src/integrations/poe-trade/searchQuery'
import { recordCurrentSearch } from '../../src/lib/history'
const stored: Record<string, unknown> = {}
beforeEach(() => {
    vi.resetAllMocks()
    stored['trade-history'] = { value: [], expiresAt: null }
    vi.mocked(browser.storage.local.get).mockImplementation((async (key: string) => ({
        [key]: stored[key],
    })) as typeof browser.storage.local.get)
    vi.mocked(browser.storage.local.set).mockImplementation(async (value) => {
        Object.assign(stored, value)
    })
})
const entries = () => (stored['trade-history'] as { value: { title: string }[] }).value
it('derives the title from the search parameters', async () => {
    window.history.replaceState({}, '', '/trade/search/Standard/H4sIslug')
    vi.mocked(searchTitle).mockResolvedValue('Mageblood')
    await recordCurrentSearch()
    expect(entries()[0].title).toBe('Mageblood')
    expect(vi.mocked(searchTitle)).toHaveBeenCalledWith('H4sIslug', '1')
})
it('falls back to the panel title when the slug has no readable parameters', async () => {
    window.history.replaceState({}, '', '/trade/search/Standard/abc123')
    vi.mocked(searchTitle).mockResolvedValue('')
    await recordCurrentSearch()
    expect(entries()[0].title).toBe('')
})
it('does not record non-search pages', async () => {
    window.history.replaceState({}, '', '/trade/exchange/Standard/abc123')
    expect(await recordCurrentSearch()).toBe(false)
    expect(entries()).toEqual([])
})
