import { expect, it } from 'vitest'
import { place, type TradesByFolder } from '../../../src/features/bookmarks/hooks/useBookmarkDnd'
import type { Trade } from '../../../src/lib/bookmarks/storage'

const trade = (id: string): Trade => ({
    id,
    title: id,
    completedAt: null,
    location: { version: '1', type: 'search', slug: '' },
})
const ids = (trades: TradesByFolder, folderId: string) => trades[folderId].map((t) => t.id)

it('moves a trade down within its own folder', () => {
    const trades: TradesByFolder = { A: [trade('t1'), trade('t2'), trade('t3')] }
    expect(ids(place(trades, 't1', 't2')!, 'A')).toEqual(['t2', 't1', 't3'])
})

it('moves a trade up within its own folder', () => {
    const trades: TradesByFolder = { A: [trade('t1'), trade('t2'), trade('t3')] }
    expect(ids(place(trades, 't3', 't1')!, 'A')).toEqual(['t3', 't1', 't2'])
})

it('returns null when the trade is dropped on its own row', () => {
    const trades: TradesByFolder = { A: [trade('t1'), trade('t2')] }
    expect(place(trades, 't1', 't1')).toBeNull()
})

it('moves a trade into another folder at the target row', () => {
    const trades: TradesByFolder = { A: [trade('t1')], B: [trade('t3'), trade('t4')] }
    const next = place(trades, 't1', 't3')!
    expect(ids(next, 'A')).toEqual([])
    expect(ids(next, 'B')).toEqual(['t1', 't3', 't4'])
})

it('appends after the target row when crossing folders below it', () => {
    const trades: TradesByFolder = { A: [trade('t1')], B: [trade('t3'), trade('t4')] }
    const next = place(trades, 't1', 't3', true)!
    expect(ids(next, 'B')).toEqual(['t3', 't1', 't4'])
})

it('appends to the end when dropped on a folder rather than a row', () => {
    const trades: TradesByFolder = { A: [trade('t1')], B: [trade('t3')] }
    const next = place(trades, 't1', 'B')!
    expect(ids(next, 'A')).toEqual([])
    expect(ids(next, 'B')).toEqual(['t3', 't1'])
})

it('returns null when the active trade is not found', () => {
    const trades: TradesByFolder = { A: [trade('t1')] }
    expect(place(trades, 'missing', 't1')).toBeNull()
})

it('returns null when the target is neither a row nor a folder', () => {
    const trades: TradesByFolder = { A: [trade('t1')], B: [trade('t3')] }
    expect(place(trades, 't1', 'missing')).toBeNull()
})
