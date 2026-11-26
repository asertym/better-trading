import { browser } from 'wxt/browser'
import { Icon } from '../../components/Icon'

const logo = browser.runtime.getURL('/assets/images/logo.png')

export function PanelHeader({
    collapsed,
    side,
    about,
    onToggleCollapsed,
    onCloseAbout,
    onToggleAbout,
}: {
    collapsed: boolean
    side: 'left' | 'right'
    about: boolean
    onToggleCollapsed: () => void
    onCloseAbout: () => void
    onToggleAbout: () => void
}) {
    return (
        <>
            <button
                className={`bt-expand ${side === 'left' ? 'bt-expand-left' : ''} ${collapsed ? 'visible' : ''}`}
                onClick={onToggleCollapsed}
                aria-label="Expand Better Trading">
                <img src={logo} alt="" />
            </button>
            <header className="bt-header">
                <button
                    className="bt-header-button"
                    onClick={onToggleCollapsed}
                    aria-label="Collapse Better Trading">
                    <Icon name="sidebar" />
                </button>
                <button className="bt-brand" onClick={onCloseAbout}>
                    <img src={logo} alt="" />
                    <span>Better Trading+</span>
                </button>
                <button
                    className="bt-header-button"
                    onClick={onToggleAbout}
                    aria-label={about ? 'Close about' : 'About Better Trading'}>
                    <Icon name={about ? 'close' : 'info'} />
                </button>
            </header>
        </>
    )
}
