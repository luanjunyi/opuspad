# Release Guide

This document outlines the steps to build, package, and release new versions of the OpusPad Chrome Extension.

The release pipeline has two parts:

1. **Local release script** (`scripts/release.mjs`) — bumps version numbers, packs the zip
2. **GitHub Actions workflow** (`.github/workflows/release.yml`) — automated CI that builds and publishes a GitHub Release on every `v*` tag push

---

## Release Script Commands

The local release script, invoked via `npm run release`, has three subcommands:

| Command | Usage | Behavior |
|---------|-------|----------|
| `query` | `npm run release query` | Prints the current version (from `package.json`) |
| `bump` | `npm run release bump 1.4.0` | Writes the new version to `package.json`, `manifest.json`, and `docs/index.html` |
| `pack` | `npm run release pack` | Zips `dist/` into `opuspad_chrome-v{version}.zip` |

---

## Full Release Workflow

### 1. Check the current version

```bash
npm run release query
```

### 2. Bump the version

```bash
npm run release bump <new_version>
```

Example: `npm run release bump 1.4.0`

This updates the version in three files:
- `package.json`
- `manifest.json`
- `docs/index.html` (version badge)

### 3. Commit the version bump

```bash
git add package.json manifest.json docs/index.html
git commit -m "chore: bump version to <new_version>"
```

Or, if those are the only changes:

```bash
git commit -am "chore: bump version to <new_version>"
```

### 4. Build the extension

```bash
npm run build
```

This runs `tsc && vite build`, producing the unpacked extension in `dist/`.

### 5. (Optional) Create a local zip

```bash
npm run release pack
```

Produces `opuspad_chrome-v{version}.zip` in the repo root. Useful for manual Chrome Web Store uploads.

### 6. Tag the release

The tag **must** start with `v` to trigger the GitHub Actions workflow.

```bash
git tag v<new_version>
```

Example: `git tag v1.4.0`

### 7. Push to GitHub

```bash
git push origin main
git push origin v<new_version>
```

Once the tag is pushed, the GitHub Actions workflow automatically:
1. Checks out the code at the tag
2. Installs dependencies (`npm ci`)
3. Builds the extension (`npm run build`)
4. Zips `dist/` into `opuspad_chrome-v{version}.zip`
5. Publishes a GitHub Release with the zip attached and auto-generated release notes

---

## Updating an Existing Release (Force Method)

If you find an issue and need to update the published zip without bumping the version, you can force-push the tag. The CI workflow allows updates (`allowUpdates: true`) and will replace the artifact on the existing GitHub Release.

1. Make your code changes and commit them.
2. Force-update the tag locally:
   ```bash
   git tag -f v<version>
   ```
3. Force-push the tag:
   ```bash
   git push -f origin v<version>
   ```

---

## Chrome Web Store Upload

Once the zip is generated (either locally via `npm run release pack` or downloaded from the GitHub Release), upload it to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/). See `docs/SUBMISSION_GUIDE.md` for the full store submission checklist (assets, descriptions, privacy declarations, etc.).
