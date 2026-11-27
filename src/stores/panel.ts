import { preferences } from '../lib/preferences'
import { create } from 'zustand'

export type PanelPage = 'bookmarks' | 'history' | 'pinned-items'
export type PanelSide = 'left' | 'right'
interface PanelState {
    page: PanelPage
    collapsed: boolean
    side: PanelSide
    setPage: (page: PanelPage) => void
    toggleCollapsed: () => void
    setSide: (side: PanelSide) => void
}

export const usePanelStore = create<PanelState>((set) => ({
    page: (['bookmarks', 'history', 'pinned-items'].includes(
        preferences.getItem('bt-current-page') ?? ''
    )
        ? preferences.getItem('bt-current-page')
        : 'bookmarks') as PanelPage,
    collapsed: Boolean(preferences.getItem('bt-side-panel-collapsed')),
    setPage: (page) => {
        preferences.setItem('bt-current-page', page)
        set({ page })
    },
    toggleCollapsed: () =>
        set((state) => {
            if (state.collapsed) preferences.removeItem('bt-side-panel-collapsed')
            else preferences.setItem('bt-side-panel-collapsed', 'true')
            return { collapsed: !state.collapsed }
        }),
    side: preferences.getItem('bt-panel-side') === 'left' ? 'left' : 'right',
    setSide: (side) => {
        if (side === 'left') preferences.setItem('bt-panel-side', side)
        else preferences.removeItem('bt-panel-side')
        set({ side })
    },
}))
