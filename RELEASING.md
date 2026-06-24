# Releasing and submitting Postbox

This is the maintainer runbook for cutting a release and submitting the plugin to the Obsidian community store. As of 2026 you no longer open a pull request against `obsidianmd/obsidian-releases`: you submit the repository at [community.obsidian.md](https://community.obsidian.md) and an automated review checks the release.

## Pre-submission checklist

- `manifest.json` `id` is unique and contains no "obsidian" (current: `postbox`).
- `manifest.json` `version` matches `versions.json` and the release tag.
- `manifest.json` has `minAppVersion`, `description`, `author`, and `isDesktopOnly: true`.
- `description` starts with an action verb, stays under 250 characters, ends with a period, and has no emoji.
- `README.md`, `LICENSE`, and `manifest.json` are in the repository root.
- No network calls, no telemetry, no obfuscated code, and no leftover sample code.
- `npm run build` is clean.

## Step 1: Cut the release

The version tag must match `manifest.json` `version` exactly, with no leading `v`.

```bash
npm run build
git tag 0.1.0
git push origin 0.1.0
```

The `.github/workflows/release.yml` workflow builds the plugin and creates a GitHub release for the tag, attaching `main.js`, `manifest.json`, and `styles.css` as assets. Confirm the release and its three assets appear under the repository's Releases page.

## Step 2: Submit to the community store

1. Sign in at [community.obsidian.md](https://community.obsidian.md) with your Obsidian account.
2. Link your GitHub account so ownership of the repository can be verified.
3. Select Plugins, then New plugin.
4. Enter the repository URL: `https://github.com/istefox/Postbox`.
5. Agree to the developer policies and the support commitment.
6. Select Submit.

The automated review usually returns results within a few minutes. On success the plugin is searchable and installable in Obsidian within about 24 hours.

## Step 3: Address feedback

If the automated review reports issues, fix them, increment the version in `manifest.json` and `versions.json`, and publish a new release (repeat Step 1). The review re-runs on the new release.

## Future releases

Bump `version` in `manifest.json`, add the matching `version: minAppVersion` entry to `versions.json`, commit, then run Step 1 with the new tag. Submission (Step 2) is only needed for the first listing; later releases are picked up automatically from new tags.
