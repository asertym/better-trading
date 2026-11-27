import { expect, it, vi } from 'vitest'

const storage = new Map<string, string>()
vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
        storage.set(key, value)
    },
    removeItem: (key: string) => {
        storage.delete(key)
    },
})
const setUrl = (href: string) => vi.stubGlobal('location', { href })

// Each scenario gets a fresh module instance, like a fresh page load.
const freshPage = async () => {
    vi.resetModules()
    return import('../../../src/lib/results/pageCapture')
}

it('captures the first parseable price per search and re-captures on a new url', async () => {
    const { updateFirstListingPrice, getFirstListingPrice } = await freshPage()
    const priceA = { amount: 1, currency: 'chaos-orb' }
    setUrl('https://trade.example/search-a')
    // Boot pass: no rows yet; must not lock in undefined.
    expect(updateFirstListingPrice(undefined, false)).toBeUndefined()
    expect(getFirstListingPrice()).toBeUndefined()
    // A's rows arrive: this is the capture moment, and the value flows back.
    expect(updateFirstListingPrice(priceA, true)).toEqual(priceA)
    expect(getFirstListingPrice()).toEqual(priceA)
    // A re-sort re-renders fresh rows at the same url and must not overwrite.
    expect(updateFirstListingPrice({ amount: 99, currency: 'divine-orb' }, true)).toBeUndefined()
    expect(getFirstListingPrice()).toEqual(priceA)
    // Typing item B moves the url while A's rows are still on screen.
    setUrl('https://trade.example/search-b')
    expect(updateFirstListingPrice(priceA, false)).toBeUndefined()
    expect(getFirstListingPrice()).toBeUndefined()
    // B's rows arrive and must be captured.
    const priceB = { amount: 5, currency: 'divine-orb' }
    expect(updateFirstListingPrice(priceB, true)).toEqual(priceB)
    expect(getFirstListingPrice()).toEqual(priceB)
})

it('keeps the pending bookmark until its price is captured, then takes it once', async () => {
    const { setPendingBookmarkTrade, takePendingBookmarkTrade, updateFirstListingPrice } =
        await freshPage()
    storage.clear()
    setPendingBookmarkTrade('bm')
    setUrl('https://trade.example/search-c')
    // The boot pass runs before rows arrive and must not void the flag.
    expect(updateFirstListingPrice(undefined, false)).toBeUndefined()
    // Rows arrive; the flag is still available for the controller to take.
    expect(updateFirstListingPrice({ amount: 2, currency: 'chaos-orb' }, true)).toEqual(
        { amount: 2, currency: 'chaos-orb' }
    )
    expect(takePendingBookmarkTrade()).toBe('bm')
    expect(takePendingBookmarkTrade()).toBeUndefined()
})

it('survives a post-load url rewrite', async () => {
    const { setPendingBookmarkTrade, takePendingBookmarkTrade, updateFirstListingPrice } =
        await freshPage()
    storage.clear()
    setPendingBookmarkTrade('bm')
    setUrl('https://trade.example/trade/search')
    expect(updateFirstListingPrice(undefined, false)).toBeUndefined()
    // The destination page rewrites its url after load; rows arrive at the
    // rewritten url and must still capture (and leave the flag to take).
    setUrl('https://trade.example/trade/search/Standard/rewritten')
    expect(updateFirstListingPrice({ amount: 4, currency: 'chaos-orb' }, true)).toEqual(
        { amount: 4, currency: 'chaos-orb' }
    )
    expect(takePendingBookmarkTrade()).toBe('bm')
})
