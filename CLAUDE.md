# CLAUDE.md — Postbox (Obsidian EML/MSG to Markdown)

> Name: **Postbox** (manifest id `postbox`). Verify id/name availability against the Obsidian community registry before store submission.
> Full product spec: `20260623_ObsidianEmlPlugin_Spec_v1.md`. The spec is the source of truth — if this file and the spec disagree, the spec wins.

## Project

Obsidian plugin that imports `.eml` and `.msg` email files and converts them into native Markdown notes: HTML body → Markdown, attachments extracted to disk and linked, inline CID images rendered in place, structured YAML frontmatter, manual import + watch-folder. Desktop only. Target: official Obsidian community store.

## Tech stack

- TypeScript, bundled to a single `main.js` with esbuild.
- Obsidian API only for vault/UI operations. Node `fs` only for the external watch-folder.
- Suggested libs (validate at build): `postal-mime` (.eml), `@kenjiuno/msgreader` or equivalent pure-JS (.msg), `turndown` + `turndown-plugin-gfm` (HTML→MD). No native dependencies.

## Hard rules (community store + correctness)

- `isDesktopOnly: true` in `manifest.json`.
- No network calls. No telemetry. Fully offline. No obfuscated code.
- Never modify, move, or delete the source `.eml`/`.msg` file.
- Never write outside the configured vault folders, except reading the configured watch-folder.
- All user-facing strings (settings, commands, notices), code, and comments in **English**.
- Use `normalizePath` for vault paths; sanitize filenames (illegal chars, length cap, empty-subject fallback `no-subject`).
- Async I/O; never block the UI on batch imports.
- Dedup before creating a note: look up `message-id` via `MetadataCache`. If found, skip.

## Architecture

```
src/
  main.ts         # lifecycle, commands, context menu, watcher registration
  settings.ts     # settings interface + PluginSettingTab
  parser/eml.ts   # postal-mime wrapper -> normalized ParsedEmail
  parser/msg.ts   # msgreader wrapper  -> normalized ParsedEmail
  converter.ts    # HTML->MD, inline CID resolution, body assembly
  note-builder.ts # frontmatter, filename template, sanitization
  attachments.ts  # write attachments, collision handling, unique prefix
  dedup.ts        # Message-ID lookup via MetadataCache
  watcher.ts      # watch-folder initial scan + live watch + debounced queue
```

Both parsers must emit one normalized `ParsedEmail` shape so `converter`/`note-builder` stay format-agnostic: `{ from, to, cc, subject, date, messageId, htmlBody, textBody, attachments[], inlineImages[] }`.

## Conventions

- Strict TypeScript (`strict: true`), no `any` unless unavoidable and commented.
- Pure functions for parsing/conversion (testable without Obsidian); side effects (vault writes, notices) isolated in `main.ts`/`attachments.ts`.
- Settings have sensible defaults (see spec §5); folders created if missing.
- Filename template variables: `{{date}} {{time}} {{from}} {{subject}} {{messageId}}`.
- Frontmatter: ISO 8601 dates, YAML-quote values with special chars, Dataview-friendly.

## Build & dev

- `npm run dev` — esbuild watch.
- `npm run build` — typecheck (`tsc --noEmit`) + production bundle.
- Manual test: copy `main.js`, `manifest.json`, `styles.css` into a test vault `.obsidian/plugins/postbox/`.
- Keep `versions.json` in sync with `manifest.json` minAppVersion.

## Acceptance (must pass — see spec §9)

1. `.eml` with PDF + inline image → full frontmatter, MD body, PDF in `## Attachments`, inline image rendered in body; note opens (manual import).
2. `.msg` produces the same result as `.eml`.
3. Re-import → no duplicate note (skip via Message-ID).
4. Watch-folder → auto note, no auto-open, aggregated Notice.
5. Configured template/paths respected.
6. Source file untouched.
7. Clean esbuild build, no TS errors, `isDesktopOnly: true`.
8. No network calls; store-guidelines compliant.

## Definition of done

All acceptance criteria pass, README documents settings + install, LICENSE present, no console errors on load/unload, plugin unregisters watchers cleanly on `onunload`.
