import { browser } from 'wxt/browser'
import { reportIntegrationIssue } from '../diagnostics'

export interface TradeStat {
    id: string
    text: string
    type: string
}
const ttl = 86_400_000
const catalogCache = new Map<string, { expires: number; request: Promise<unknown> }>()
function cachedCatalog<T>(key: string, load: () => Promise<T>): Promise<T> {
    const existing = catalogCache.get(key)
    if (existing && existing.expires > Date.now()) return existing.request as Promise<T>
    const request = load()
    catalogCache.set(key, { expires: Date.now() + ttl, request })
    void request.catch(() => catalogCache.delete(key))
    return request
}
async function tradeCatalogData<T>(
    key: string,
    path: string,
    label: string,
    parse: (data: unknown) => T,
    valid: (value: unknown) => value is T
): Promise<T> {
    let stored: { value?: unknown; expiresAt?: number } | undefined
    try {
        const value = (await browser.storage.local.get(key))[key]
        if (value && typeof value === 'object' && 'value' in value)
            stored = {
                value: value.value,
                expiresAt:
                    'expiresAt' in value && typeof value.expiresAt === 'number'
                        ? value.expiresAt
                        : undefined,
            }
    } catch {
        /* Storage is optional. */
    }
    if (stored && valid(stored.value) && Number(stored.expiresAt) > Date.now()) return stored.value
    try {
        const origin =
            typeof location !== 'undefined' && /(^|\.)pathofexile\.com$/.test(location.hostname)
                ? location.origin
                : 'https://www.pathofexile.com'
        const response = await fetch(
            new URL(path, origin).href,
            { credentials: 'include', signal: AbortSignal.timeout(15000) }
        )
        if (!response.ok) throw new Error(label)
        const parsed = parse(await response.json())
        try {
            await browser.storage.local.set({
                [key]: { value: parsed, expiresAt: Date.now() + ttl },
            })
        } catch {
            /* Use the in-memory catalog if storage is full. */
        }
        return parsed
    } catch (error) {
        reportIntegrationIssue('poe-trade', label)
        if (stored && valid(stored.value)) return stored.value
        throw error
    }
}
function validEntries(value: unknown): value is TradeStat[] {
    return (
        Array.isArray(value) &&
        value.every(
            (entry) =>
                typeof entry?.id === 'string' &&
                typeof entry.text === 'string' &&
                typeof entry.type === 'string'
        )
    )
}
function parseStats(data: unknown): TradeStat[] {
    if (
        !data ||
        typeof data !== 'object' ||
        !('result' in data) ||
        !Array.isArray(data.result)
    )
        throw new Error('Invalid stat metadata')
    return data.result
        .flatMap((group) => (Array.isArray(group?.entries) ? group.entries : []))
        .filter(
            (entry) =>
                typeof entry?.id === 'string' &&
                typeof entry.text === 'string' &&
                typeof entry.type === 'string'
        )
        .map(({ id, text, type }) => ({ id, text, type }))
}
export async function tradeStatCatalog(version: '1' | '2') {
    const key = `bt-trade-stat-catalog-v1--${version}`
    return cachedCatalog(key, () =>
        tradeCatalogData(
            key,
            `/api/trade${version === '2' ? '2' : ''}/data/stats`,
            'Stat metadata unavailable',
            parseStats,
            validEntries
        )
    )
}
export async function resolveTradeStat(text: string, version: '1' | '2') {
    const matches = (await tradeStatCatalog(version)).filter(
        (entry) => entry.type === 'explicit' && entry.text === text
    )
    return matches.length === 1 ? matches[0].id : undefined
}

export interface TradeFilterOption {
    id: string
    text: string
}
export interface TradeFilter {
    text: string
    options: TradeFilterOption[]
}
export type TradeFilterCatalog = Record<string, Record<string, TradeFilter>>
function isTradeFilterOption(value: unknown): value is TradeFilterOption {
    return (
        !!value &&
        typeof value === 'object' &&
        typeof (value as Record<string, unknown>).id === 'string' &&
        typeof (value as Record<string, unknown>).text === 'string'
    )
}
function parseFilters(data: unknown): TradeFilterCatalog {
    const result: unknown[] =
        data && typeof data === 'object' && Array.isArray((data as { result?: unknown }).result)
            ? (data as { result: unknown[] }).result
            : []
    const catalog: TradeFilterCatalog = {}
    for (const group of result) {
        if (!group || typeof group !== 'object') continue
        const g = group as { id?: unknown; filters?: unknown }
        if (typeof g.id !== 'string' || !Array.isArray(g.filters)) continue
        catalog[g.id] = {}
        for (const filter of g.filters) {
            if (!filter || typeof filter !== 'object') continue
            const f = filter as { id?: unknown; text?: unknown; option?: unknown }
            if (typeof f.id !== 'string' || typeof f.text !== 'string') continue
            catalog[g.id][f.id] = {
                text: f.text,
                options: Array.isArray((f.option as { options?: unknown })?.options)
                    ? ((f.option as { options: unknown[] }).options).filter(isTradeFilterOption)
                    : [],
            }
        }
    }
    return catalog
}
function isFilterCatalog(value: unknown): value is TradeFilterCatalog {
    return (
        !!value &&
        typeof value === 'object' &&
        Object.values(value as Record<string, unknown>).every(
            (group) =>
                !!group &&
                typeof group === 'object' &&
                Object.values(group as Record<string, unknown>).every(
                    (filter) =>
                        !!filter &&
                        typeof filter === 'object' &&
                        typeof (filter as TradeFilter).text === 'string' &&
                        Array.isArray((filter as TradeFilter).options)
                )
        )
    )
}
export async function tradeFilterCatalog(version: '1' | '2') {
    const key = `bt-trade-filter-catalog-v1--${version}`
    return cachedCatalog(key, () =>
        tradeCatalogData(
            key,
            `/api/trade${version === '2' ? '2' : ''}/data/filters`,
            'Filter metadata unavailable',
            parseFilters,
            isFilterCatalog
        )
    )
}
export function canonicalStatText(text: string) {
    return text
        .toLowerCase()
        .replace(/\([\d.]+-[\d.]+\)|[+-]?\d+(?:\.\d+)?/g, '#')
        .replace(/flasks/g, 'flask')
        .replace(/effects/g, 'effect')
        .replace(/\bapply\b/g, 'applies')
        .replace(/\btheir\b/g, 'its')
        .replace(/\s+/g, ' ')
        .trim()
}
