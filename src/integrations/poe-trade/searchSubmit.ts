// Detects when the user actually submits a search: the Search button, Enter in
// the item search input, or back/forward navigation. Filter-only URL changes
// fire none of these events.
export function watchSearchSubmissions(onSubmit: () => void): () => void {
    const onSearchClick = (event: MouseEvent) => {
        if ((event.target as HTMLElement | null)?.closest?.('button.search-btn')) onSubmit()
    }
    const onKeyDown = (event: KeyboardEvent) => {
        if (
            event.key === 'Enter' &&
            (event.target as HTMLElement | null)?.matches?.('input.multiselect__input')
        )
            onSubmit()
    }
    const onPopState = () => onSubmit()
    window.addEventListener('click', onSearchClick, true)
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('popstate', onPopState)
    return () => {
        window.removeEventListener('click', onSearchClick, true)
        window.removeEventListener('keydown', onKeyDown, true)
        window.removeEventListener('popstate', onPopState)
    }
}
