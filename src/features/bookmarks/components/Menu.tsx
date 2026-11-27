import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '../../../components/Icon'

/**
 * A dropdown menu for folder/trade actions. Closes when an item is clicked, the pointer
 * leaves it, or Escape is pressed — so a click on an action never leaves it hanging open.
 */
export function Menu({ label, children }: { label: string; children: ReactNode }) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        // Inside mousedowns are stopped at the menu (below), so any mousedown that reaches
        // the document is outside it and closes the menu. This avoids judging membership via
        // event.target, which the browser retargets to the shadow host across the panel's
        // shadow root.
        const onOutsideDown = () => setOpen(false)
        const onInsideDown = (event: MouseEvent) => event.stopPropagation()
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false)
        }
        document.addEventListener('mousedown', onOutsideDown)
        document.addEventListener('keydown', onKey)
        ref.current?.addEventListener('mousedown', onInsideDown)
        return () => {
            document.removeEventListener('mousedown', onOutsideDown)
            document.removeEventListener('keydown', onKey)
            ref.current?.removeEventListener('mousedown', onInsideDown)
        }
    }, [open])

    return (
        <div className="bt-menu" ref={ref}>
            <button
                type="button"
                aria-label={label}
                aria-expanded={open}
                onClick={() => setOpen(!open)}>
                <Icon name="options" />
            </button>
            {open && (
                // A click anywhere in the panel closes it, so every item toggles the menu off.
                <div onClick={() => setOpen(false)}>{children}</div>
            )}
        </div>
    )
}
