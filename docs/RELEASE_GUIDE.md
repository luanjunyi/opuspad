# Release Guide

This document outlines the steps to build, package, and release new versions of OpusPad Chrome Extension. 

We use a local release script to bump versions and generate the package, combined with an automated GitHub Actions workflow that creates a GitHub Release whenever a new version tag (`v*`) is pushed to the repository.

## 1. Prepare the Release

When you are ready to make a release, use the included release script. This script will automatically bump the version numbers in `package.json`, `manifest.json`, and update the version badge on the documentation site (`docs/index.html`). It will also create a local zip file for your convenience.

```bash
npm run release <new_version>
```
*Example: `npm run release 1.3`*

## 2. Commit the Changes

Commit the version bump changes to your local git repository.

```bash
git add package.json manifest.json docs/index.html
git commit -m "chore: bump version to <new_version>"
```

## 3. Tag the Release

Create a git tag for the new version. The tag **must** start with a `v` to trigger the automated GitHub Action.

```bash
git tag v<new_version>
```
*Example: `git tag v1.3`*

## 4. Push to GitHub

Push your commit and the new tag to GitHub.

```bash
git push && git push origin v<new_version>
```

Once pushed, the GitHub Action will automatically:
1. Build the extension.
2. Create a zip artifact (`opuspad_chrome-v<new_version>.zip`).
3. Publish a new GitHub Release with the zip file attached.

---

## Updating an Existing Release (Force Method)

If you find an issue with a release and need to update the published zip file without bumping the version number, you can forcefully update the git tag. 

The GitHub Action is configured to allow updates and will seamlessly overwrite the existing artifact on the GitHub Release.

**1. Make your code changes and commit them.**

**2. Force update the tag locally to point to your new commit:**
```bash
git tag -f v<version>
```
*Example: `git tag -f v1.3`*

**3. Force push the tag to GitHub:**
```bash
git push -f origin v<version>
```

The GitHub Action will trigger again, build the new code, and replace the artifact on the existing release.

---

## Chrome Web Store

Once the release is ready and the zip file is generated (either locally by the release script or via the GitHub Actions release artifact), you can upload the zip file to the Chrome Web Store Developer Dashboard to publish the update to users. See `SUBMISSION_GUIDE.md` for more details.