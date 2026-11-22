import { beforeEach, expect, it, vi } from 'vitest'
vi.mock('wxt/browser', () => ({
    browser: { storage: { local: { get: vi.fn(), set: vi.fn(), remove: vi.fn() } } },
}))
import { browser } from 'wxt/browser'
import {
    getTrades,
    recordTradePrice,
    removeFolder,
} from '../../../src/lib/bookmarks/storage'
const stored: Record<string, unknown> = {}
beforeEach(() => {
    vi.resetAllMocks()
    stored['bookmark-folders'] = {
        value: [
            { id: 'one', version: '1', archivedAt: null },
            { id: 'two', version: '1', archivedAt: null },
        ],
        expiresAt: null,
    }
    stored['bookmark-trades--one'] = {
        value: [{ id: 'trade', location: { type: 'search', slug: 'abc' } }],
    }
    vi.mocked(browser.storage.local.get).mockImplementation((async (key: string) => ({
        [key]: stored[key],
    })) as typeof browser.storage.local.get)
    vi.mocked(browser.storage.local.set).mockImplementation(async (value) => {
        Object.assign(stored, value)
    })
    vi.mocked(browser.storage.local.remove).mockImplementation(async () => {
        delete stored['bookmark-trades--one']
    })
})
it('keeps trades intact when removing the folder fails', async () => {
    vi.mocked(browser.storage.local.set).mockRejectedValueOnce(new Error('Write failed'))
    await expect(removeFolder('one')).rejects.toThrow('Write failed')
    expect(browser.storage.local.remove).not.toHaveBeenCalled()
    expect(stored['bookmark-trades--one']).toBeDefined()
})
it('removes the visible folder even if orphaned data cleanup fails', async () => {
    vi.mocked(browser.storage.local.remove).mockRejectedValueOnce(new Error('Cleanup failed'))
    await removeFolder('one')
    expect(stored['bookmark-folders']).toMatchObject({ value: [{ id: 'two' }] })
    expect(stored['bookmark-trades--one']).toBeDefined()
})
it('removes the folder and its contents on success', async () => {
    await removeFolder('one')
    expect(stored['bookmark-folders']).toMatchObject({ value: [{ id: 'two' }] })
    expect(stored['bookmark-trades--one']).toBeUndefined()
})

it('records the price on the trade in whichever folder holds it, overwriting the old value', async () => {
    expect(await recordTradePrice('trade', { amount: 12.5, currency: 'chaos-orb' })).toBe('one')
    expect(stored['bookmark-trades--one']).toMatchObject({
        value: [{ id: 'trade', lastObservedPrice: { amount: 12.5, currency: 'chaos-orb' } }],
    })
    expect(
        await recordTradePrice('trade', { amount: 1, currency: 'divine-orb', icon: 'x.png' })
    ).toBe('one')
    expect(stored['bookmark-trades--one']).toMatchObject({
        value: [{ lastObservedPrice: { amount: 1, currency: 'divine-orb', icon: 'x.png' } }],
    })
    expect(await recordTradePrice('missing', { amount: 1, currency: 'chaos-orb' })).toBeNull()
})
it('does not replace unreadable or malformed trades with an empty collection', async () => {
    vi.mocked(browser.storage.local.get).mockRejectedValueOnce(new Error('Read failed'))
    await expect(getTrades('one')).rejects.toThrow('Read failed')
    stored['bookmark-trades--one'] = { value: [null] }
    await expect(getTrades('one')).rejects.toThrow()
    stored['bookmark-trades--two'] = {
        value: [{ id: 'healthy', title: 'Healthy', location: { type: 'search', slug: 'abc' } }],
    }
    expect(await getTrades('two')).toMatchObject([{ id: 'healthy', location: { version: '1' } }])
    expect(browser.storage.local.set).not.toHaveBeenCalled()
    expect(browser.storage.local.remove).not.toHaveBeenCalled()
    expect(stored['bookmark-trades--one']).toEqual({ value: [null] })
})
