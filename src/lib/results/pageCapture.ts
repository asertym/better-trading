import type { TradePriceSnapshot } from '../bookmarks/storage'

// State captured from the current results page: the cheapest item's listing
// price, and the bookmark that opened this page (set by the bookmarks panel).
let firstListingPrice: TradePriceSnapshot | undefined
let captureUrl: string | undefined

const PENDING_BOOKMARK_TRADE_KEY = 'bt-pending-bookmark-trade'

// sessionStorage (not a module variable) because a bookmark click is a full
// page load: the flag must survive the navigation into the new page.
export function setPendingBookmarkTrade(tradeId: string) {
    sessionStorage.setItem(PENDING_BOOKMARK_TRADE_KEY, tradeId)
}
// One-shot per search: valid until taken or until the url moves on.
export function takePendingBookmarkTrade(): string | undefined {
    const tradeId = sessionStorage.getItem(PENDING_BOOKMARK_TRADE_KEY) ?? undefined
    if (tradeId !== undefined) sessionStorage.removeItem(PENDING_BOOKMARK_TRADE_KEY)
    return tradeId
}

// Searches navigate client-side, so this module's state survives across
// searches. The url moves to the new search BEFORE its results render (the
// site encodes typed values into the url), so a url change alone cannot
// trigger a capture: with fresh rows the new price is taken, without them
// (e.g. while typing) the value is dropped. Within one url only the first
// parseable price counts, so re-sorts keep it.
// Returns the captured snapshot when this call captured, so callers can
// react to the moment a search's results first render (the destination page
// may rewrite its url after load, so this cannot be keyed on url stability).
export function updateFirstListingPrice(
    price: TradePriceSnapshot | undefined,
    hasFreshRows: boolean
): TradePriceSnapshot | undefined {
    const url = location.href
    if (captureUrl !== url) {
        captureUrl = url
        firstListingPrice = hasFreshRows ? price : undefined
        return firstListingPrice
    }
    if (price !== undefined && firstListingPrice === undefined) {
        firstListingPrice = price
        return price
    }
    return undefined
}
export function getFirstListingPrice() {
    return firstListingPrice
}
