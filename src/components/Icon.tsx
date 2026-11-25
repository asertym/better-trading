import {
    MagnifyingGlassIcon,
    GithubLogoIcon,
    XIcon,
    ArrowsDownUpIcon,
    ExportIcon,
    DownloadIcon,
    QuestionIcon,
    InfoIcon,
    GearIcon,
    CaretDownIcon,
    DotsThreeIcon,
    ArrowsInIcon,
    ArchiveIcon,
    ArrowCounterClockwiseIcon,
    FolderPlusIcon,
    PlusSquareIcon,
    SidebarIcon,
    CaretUpDownIcon,
    DotsThreeVerticalIcon,
    PlusIcon,
    PushPinIcon,
    PushPinSlashIcon,
    BookmarkIcon,
    ClockCounterClockwiseIcon,
} from '@phosphor-icons/react'

const icons = {
    search: MagnifyingGlassIcon,
    github: GithubLogoIcon,
    close: XIcon,
    sort: CaretUpDownIcon,
    export: ExportIcon,
    import: DownloadIcon,
    help: QuestionIcon,
    info: GearIcon,
    chevron: CaretDownIcon,
    options: DotsThreeVerticalIcon,
    collapse: ArrowsInIcon,
    sidebar: SidebarIcon,
    archive: ArchiveIcon,
    undo: ArrowCounterClockwiseIcon,
    pin: PushPinIcon,
    pinDisabled: PushPinSlashIcon,
    bookmarks: BookmarkIcon,
    history: ClockCounterClockwiseIcon,
    'new-folder': PlusIcon,
    'import-folder': PlusSquareIcon,
}

export function Icon({ name, className }: { name: keyof typeof icons; className?: string }) {
    const I = icons[name]
    return (
        <I
            className={className ? `bt-icon ${className}` : 'bt-icon'}
            aria-hidden="true"
            focusable="false"
        />
    )
}
