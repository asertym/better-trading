![Better Trading+ logo](public/assets/images/logo.png)

# Better Trading+

A browser extension that enhances the pathofexile.com trade site experience for Path of Exile and Path of Exile 2.

This fork maintains existing Better Trading features, with support for both Firefox and Chromium builds.

## Features

- Bookmarks manager with folders, icons, drag ordering, and archiving
- Folder sharing through import/export, plus file backups and restore
- Equivalent pricing calculator powered by [poe.ninja](https://poe.ninja/)
- Pinned items with quick navigation to the original result
- Search history and descriptive browser-tab titles
- Merging Live Queries to a single tab
- Wiki and PoEDB links in searched items
- Filtering shortcuts
- Autofill tilde in stat and search inputs
- Browser Back/Forward navigation between trade searches

## Contributing

1. Install a current Node.js LTS release and pnpm.
2. Install dependencies with `pnpm install`.
3. Run `pnpm run dev` for Chrome or `pnpm run dev:firefox` for Firefox.

Development launches use separate persistent browser profiles in `.dev-profiles/`,
so logins and test data survive restarts.

Run `pnpm run typecheck` and `pnpm test` to check changes. Tests mirror `src/` under `test/`, with fixtures beside the integration tests.

## Building and packaging

| Browser | Build                    | Package                |
| ------- | ------------------------ | ---------------------- |
| Chrome  | `pnpm run build`         | `pnpm run zip`         |
| Firefox | `pnpm run build:firefox` | `pnpm run zip:firefox` |

Builds and extension archives are generated in `.output/`.

## Release notes

The version in `package.json` determines the extension version and the release
notes loaded from `changelogs/<version>.md`. When releasing, update the version
and add the corresponding Markdown file with a title and Added, Changed, or
Fixed sections.

Run `pnpm run check:changelog` to validate. Build and package commands run this
check automatically. Only the current release notes are bundled with the
extension and shown in the update dialog and information panel.

## Publishing a release

First create and commit the next version's `changelogs/<version>.md`, and merge
all changes into `master` (or `main`). Then run:

```bash
pnpm run release -- patch     # Or minor / major: create a local version commit and tag
pnpm run release -- patch -y  # Also push the branch and tag to origin
```

The script validates the next changelog and requires a clean working tree before
updating `package.json` and `package-lock.json`. Without `-y`, it prints the push
command. GitHub Actions tests, packages both browsers, and publishes the release.
Use `make upload-firefox` separately for Firefox submission. Download the Chrome
ZIP from the GitHub release and upload it manually to the Chrome Web Store.

Git hooks are installed automatically by `pnpm install`. A pre-commit check
validates staged `package.json` version changes; a pre-push check validates
version tags. The workflow repeats both checks, so release validation cannot be
bypassed by skipping local hooks.

## Credits

Better Trading+ is maintained by [asertym](https://github.com/asertym).
Original fork is maintained by [Vali-98](https://github.com/Vali-98).
Better Trading was originally created by [InfaMc](https://github.com/pboutin)
and previously maintained by [brosmike](https://github.com/dbjorge).

[Original repository](https://github.com/poe-world/better-trading)

<a href="https://www.buymeacoffee.com/asertym">
  <img src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20beer&emoji=%F0%9F%8D%BA&slug=asertym&button_colour=5F7FFF&font_colour=ffffff&outline_colour=000000&coffee_colour=FFDD00" alt="Buy me a coffee" />
</a>

This extension is fan-made and is not affiliated with Grinding Gear Games.
