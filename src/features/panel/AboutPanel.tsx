import { useState, type ReactNode } from 'react'
import { DonationLink } from '../../components/DonationLink'
import { Dialog } from '../../components/Dialog'
import { ReleaseNotes } from '../../components/ReleaseNotes'
import { searchShortcutsMarkdown } from '../../lib/searchShortcutDefinitions'
import { Icon } from '../../components/Icon'
import { BackupControls } from '../bookmarks/BackupControls'
import { ChangelogDialog } from '../Changelog'
import { currentRelease } from '../../lib/releases'
import {
    enhancerIds,
    hideBookmarkPricesId,
    searchEnhancementIds,
    useSettingsStore,
} from '../../stores/settings'
import { usePanelStore } from '../../stores/panel'

const enhancerLabels: Record<(typeof enhancerIds)[number], string> = {
    'equivalent-pricings': 'Equivalent pricings (powered by poe.ninja)',
    'highlight-stat-filters': 'Highlight searched mods',
    'coloured-meta-tags': 'Coloured meta tags',
    'item-reference-links': 'Wiki and PoEDB item links',
    'unique-price-sparklines': 'Item price trends (powered by poe.ninja)',
    // Hidden and disabled by default: less useful in modern PoE.
    // 'maximum-sockets': 'Warning for armors that cannot be 6-socketed',
    // 'regroup-similars': 'Regroup similar results',
}

const searchEnhancementLabels: Record<(typeof searchEnhancementIds)[number], string> = {
    'search-history': 'Browser back/forward search history',
    'merged-live-searches': 'Merge Live Searches across tabs',
    'search-filter-shortcuts': 'Search filter shortcuts',
    'focus-item-search': 'Shift + F to focus item search',
    'focus-stat-search': 'Shift + S to focus stat filter search',
    'default-stat-filter-tilde': 'Autofill stat filter with tilde',
    'default-search-filter-tilde': 'Autofill search filter with tilde',
}

export function AboutPanel() {
    const [showShortcuts, setShowShortcuts] = useState(false)
    const [showChangelog, setShowChangelog] = useState(false)
    const { disabled, toggle } = useSettingsStore()
    const { side, setSide } = usePanelStore()
    return (
        <section className="bt-about">
            <InfoBox title={`What's new — v${currentRelease.version}`}>
                <button className="px-4" onClick={() => setShowChangelog(true)}>
                    View changelog
                </button>
            </InfoBox>

            {showChangelog && <ChangelogDialog close={() => setShowChangelog(false)} />}

            <InfoBox title="Settings">
                <div>
                    <div className="font-display">Result enhancers:</div>
                    {enhancerIds.map((id) => (
                        <SettingRow key={id} id={id} label={enhancerLabels[id]} />
                    ))}
                </div>
                <div>
                    <div className="font-display">Search enhancements:</div>
                    {searchEnhancementIds.map((id) => (
                        <SettingRow
                            key={id}
                            id={id}
                            label={searchEnhancementLabels[id]}
                            action={
                                id === 'search-filter-shortcuts' ? (
                                    <button
                                        type="button"
                                        className="bt-shortcuts-info"
                                        aria-label="Supported search shortcuts"
                                        title="Supported search shortcuts"
                                        onClick={() => setShowShortcuts(true)}>
                                        [see shortcuts]
                                    </button>
                                ) : undefined
                            }
                        />
                    ))}
                </div>
                <label className="bt-setting-checkbox">
                    <input
                        type="checkbox"
                        checked={!disabled.includes(hideBookmarkPricesId)}
                        onChange={() => toggle(hideBookmarkPricesId)}
                    />{' '}
                    Show last observed prices in bookmarks
                </label>
                <div>
                    <div className="font-display">Dock panel side:</div>
                    <div className="bt-setting-row">
                        <label className="bt-setting-checkbox">
                            <input
                                type="radio"
                                name="panel-side"
                                value="left"
                                checked={side === 'left'}
                                onChange={() => setSide('left')}
                            />{' '}
                            Left
                        </label>
                        <label className="bt-setting-checkbox">
                            <input
                                type="radio"
                                name="panel-side"
                                value="right"
                                checked={side === 'right'}
                                onChange={() => setSide('right')}
                            />{' '}
                            Right
                        </label>
                    </div>
                </div>
                {showShortcuts && (
                    <Dialog title="Search shortcuts" close={() => setShowShortcuts(false)}>
                        <div className="bt-shortcuts-reference">
                            <ReleaseNotes markdown={searchShortcutsMarkdown()} />
                        </div>
                    </Dialog>
                )}
            </InfoBox>
            <InfoBox title="Backup tools">
                <BackupControls />
            </InfoBox>
            <InfoBox title="Better Trading+">
                <p>
                    A better, better trading experience for Path of Exile and Path of Exile 2. Set
                    bookmarks, compare prices, manage live searches, and more, all in one panel.
                </p>
                <br />
                <p>
                    Found a bug, or have a feature you'd love to see? Open an issue on our GitHub
                    page.
                </p>
                <br />
                <a
                    href="https://github.com/asertym/better-trading"
                    className="bt-github-link"
                    target="_blank"
                    rel="noreferrer">
                    <Icon name="github" /> Github
                </a>
            </InfoBox>
            <InfoBox title="Credits">
                <p>
                    Better Trade+ is maintained by{' '}
                    <a className="text-amber-600!" href="https://github.com/Vali-98">
                        <strong>asertym</strong>
                    </a>
                    . Original fork is mainatined by{' '}
                    <a className="text-amber-600!" href="https://github.com/Vali-98">
                        <strong>Vali-98</strong>
                    </a>
                    . Better Trading was originally created by <strong>InfaMc</strong> (
                    <a className="text-amber-600!" href="https://github.com/pboutin">
                        @pboutin
                    </a>
                    ) and was previously maintained by <strong>brosmike</strong> (
                    <a className="text-amber-600!" href="https://github.com/dbjorge">
                        @dbjorge
                    </a>
                    ).
                </p>
                <br />
                <DonationLink />
            </InfoBox>
            <p className="bt-about-disclaimer">
                Better Trading is not affiliated with Grinding Gear Games.
            </p>
            <p className="bt-about-version">v{currentRelease.version}</p>
        </section>
    )
}

function SettingRow({ id, label, action }: { id: string; label: string; action?: ReactNode }) {
    const { disabled, toggle } = useSettingsStore()
    return (
        <div className="bt-setting-row">
            <label className="bt-setting-checkbox">
                <input
                    type="checkbox"
                    checked={!disabled.includes(id)}
                    onChange={() => toggle(id)}
                />{' '}
                {label}
            </label>
            {action}
        </div>
    )
}

function InfoBox({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="bt-info-box">
            <h2>{title}</h2>
            {children}
        </div>
    )
}
