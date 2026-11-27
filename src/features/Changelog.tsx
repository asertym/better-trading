import { preferences } from '../lib/preferences'
import { useState } from 'react'
import { DonationLink } from '../components/DonationLink'
import { ReleaseNotes } from '../components/ReleaseNotes'
import { Dialog } from '../components/Dialog'
import { Icon } from '../components/Icon'
import { currentRelease, releases } from '../lib/releases'
import { isDismissed, normalizeDismissed } from '../lib/releases/model'

export function Changelog() {
    const [dismissed, setDismissed] = useState(() => {
        const value = preferences.getItem('bt-dismissed-changelog')
        const dismissed = isDismissed(value, currentRelease, releases)
        const normalized = normalizeDismissed(value, releases)
        if (normalized && normalized !== value)
            preferences.setItem('bt-dismissed-changelog', normalized)
        return dismissed
    })
    const [open, setOpen] = useState(false)
    const dismiss = () => {
        preferences.setItem('bt-dismissed-changelog', currentRelease.version)
        setDismissed(true)
    }
    if (dismissed) return null
    return (
        <>
            <div className="bt-notice justify-between flex items-center">
                <div className="flex gap-2">
                    Better Trading v{currentRelease.version} has been updated.{' '}
                    <button className="text-blue-300 cursor-pointer" onClick={() => setOpen(true)}>
                        View changelog
                    </button>
                </div>
                <button
                    className="cursor-pointer"
                    aria-label="Dismiss update notice"
                    onClick={dismiss}>
                    <Icon name="close" />
                </button>
            </div>
            {open && <ChangelogDialog close={() => setOpen(false)} />}
        </>
    )
}
export function ChangelogDialog({ close }: { close: () => void }) {
    return (
        <Dialog title={`What's new — v${currentRelease.version}`} close={close}>
            <ReleaseNotes markdown={currentRelease.markdown} />
            <hr className="my-4 border-white/10" />
            <DonationLink />
        </Dialog>
    )
}
