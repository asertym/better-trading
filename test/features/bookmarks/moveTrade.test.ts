import { expect, it, vi } from 'vitest'
vi.mock('wxt/browser', () => ({ browser: {} }))
import { moveTrade } from '../../../src/features/bookmarks/bookmarkUtils'

const containers = {
    a: ['a1', 'a2', 'a3'],
    b: ['b1', 'b2'],
}

it('reorders within the same folder', () => {
    const next = moveTrade(containers, 'a', 'a', 0, 2)
    expect(next.a).toEqual(['a2', 'a3', 'a1'])
    expect(next.b).toEqual(['b1', 'b2'])
})

it('moves an item into the middle of another folder', () => {
    const next = moveTrade(containers, 'a', 'b', 0, 1)
    expect(next.a).toEqual(['a2', 'a3'])
    expect(next.b).toEqual(['b1', 'a1', 'b2'])
})

it('appends to a folder (drop on the folder header)', () => {
    const next = moveTrade(containers, 'a', 'b', 0, 2)
    expect(next.a).toEqual(['a2', 'a3'])
    expect(next.b).toEqual(['b1', 'b2', 'a1'])
})

it('moves into an empty folder', () => {
    const next = moveTrade({ a: ['a1'], b: [] }, 'a', 'b', 0, 0)
    expect(next.a).toEqual([])
    expect(next.b).toEqual(['a1'])
})

it('does not mutate the input containers', () => {
    const before = JSON.stringify(containers)
    moveTrade(containers, 'a', 'b', 0, 0)
    expect(containers.a).toEqual(['a1', 'a2', 'a3'])
    expect(containers.b).toEqual(['b1', 'b2'])
    expect(JSON.stringify(containers)).toBe(before)
})
