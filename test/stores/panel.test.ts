// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => {
    localStorage.clear()
    vi.resetModules()
})

it('defaults the panel to the right side', async () => {
    const { usePanelStore } = await import('../../src/stores/panel')
    expect(usePanelStore.getState().side).toBe('right')
})

it('persists moving the panel to the left and back across reloads', async () => {
    const { usePanelStore } = await import('../../src/stores/panel')
    usePanelStore.getState().setSide('left')
    vi.resetModules()
    let reloaded = await import('../../src/stores/panel')
    expect(reloaded.usePanelStore.getState().side).toBe('left')
    reloaded.usePanelStore.getState().setSide('right')
    vi.resetModules()
    reloaded = await import('../../src/stores/panel')
    expect(reloaded.usePanelStore.getState().side).toBe('right')
})
