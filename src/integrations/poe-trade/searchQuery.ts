import { decodeSearchQuery } from './encodedQuery'
import { resolveItemType } from './itemTypes'
import { tradeFilterCatalog, tradeStatCatalog } from './tradeStats'
const queryText = (value: unknown): string =>
    typeof value === 'string'
        ? value
        : value &&
            typeof value === 'object' &&
            'option' in value &&
            typeof value.option === 'string'
          ? value.option
          : ''
// The decoded query is untyped JSON; read a filter group's option map without
// assuming the shape beyond what the site actually sends.
function filterOptions(query: Record<string, unknown>, id: string): Record<string, unknown> {
    const raw = query.filters
    if (!raw || typeof raw !== 'object') return {}
    const group = (raw as Record<string, unknown>)[id]
    if (!group || typeof group !== 'object') return {}
    const filters = (group as Record<string, unknown>).filters
    return filters && typeof filters === 'object' ? (filters as Record<string, unknown>) : {}
}

export async function searchItemName(
    slug: string | undefined,
    fallback: string,
    version: '1' | '2' = '1'
) {
    if (!slug?.startsWith('H4sI')) return fallback.trim()
    try {
        const query = await decodeSearchQuery(slug)
        for (const value of [query.name, query.type]) {
            const option = queryText(value)
            if (!option) continue
            if (
                value &&
                typeof value === 'object' &&
                'discriminator' in value &&
                typeof value.discriminator === 'string'
            )
                return resolveItemType(option, value.discriminator, version)
            return option
        }
        return ''
    } catch {
        return fallback.trim()
    }
}
export async function searchTitle(slug: string | undefined, version: '1' | '2' = '1') {
    const name = await searchItemName(slug, '', version)
    if (name) return name
    if (!slug?.startsWith('H4sI')) return ''
    try {
        const query = await decodeSearchQuery(slug)
        const typeFilters = filterOptions(query, 'type_filters')
        const miscFilters = filterOptions(query, 'misc_filters')
        const ids = new Set<string>()
        for (const group of Array.isArray(query.stats) ? query.stats : []) {
            if (!group || group.disabled || !Array.isArray(group.filters)) continue
            for (const filter of group.filters)
                if (filter && !filter.disabled && typeof filter.id === 'string') ids.add(filter.id)
        }
        const typeOptions = Object.entries(typeFilters)
            .map(([id, value]) => [id, queryText(value)] as const)
            .filter(([, option]) => option && option.toLowerCase() !== 'any')
        // Only "Yes" flags describe what the search looks for; "No" excludes.
        const miscIds = Object.keys(miscFilters).filter(
            (id) => queryText(miscFilters[id]).toLowerCase() === 'true'
        )
        const catalog = typeOptions.length + miscIds.length ? await tradeFilterCatalog(version) : {}
        const parts = [
            ...typeOptions
                .filter(([id]) => id === 'category' || id === 'rarity')
                .map(
                    ([id, option]) =>
                        catalog.type_filters?.[id]?.options.find((entry) => entry.id === option)
                            ?.text ?? ''
                ),
            ...miscIds.map((id) => catalog.misc_filters?.[id]?.text ?? ''),
            ...(ids.size
                ? (await tradeStatCatalog(version))
                      .filter((entry) => ids.has(entry.id))
                      .map((entry) => entry.text)
                : []),
        ]
        return parts.filter(Boolean).join(' · ')
    } catch {
        return ''
    }
}
