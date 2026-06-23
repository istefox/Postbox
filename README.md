# Maildrop

Obsidian plugin that imports `.eml` and `.msg` email files and turns them into native Markdown notes: the HTML body becomes clean Markdown, attachments are saved to disk and linked, inline images render in place, and a structured YAML frontmatter makes every note Dataview-friendly.

> Status: the import pipeline is implemented (`.eml` and `.msg` parsing, HTML to Markdown, attachments, inline images, frontmatter, manual import, and watch folder). Acceptance is verified by a clean build; functional testing in a real vault is recommended before the first release.

Desktop only. The plugin works on `.eml`/`.msg` files already on disk, with no Outlook, IMAP, or Exchange connection.

## Features

- Import `.eml` (MIME) and `.msg` (Outlook) files.
- Convert the HTML body to Markdown, keeping links, lists, and tables.
- Extract attachments to a configurable folder and link them in the note.
- Render inline `cid:` images at the right spot in the body.
- Write a YAML frontmatter with sender, recipients, subject, date, Message-ID, attachment list, and tags.
- Import manually from the command palette or the file-explorer context menu.
- Watch an external folder and import new files automatically.
- Skip duplicates by Message-ID.

## Development

Requires Node and npm.

```bash
npm install      # install dependencies
npm run dev      # esbuild watch (rebuilds main.js on change)
npm run build    # type-check, then produce the production main.js
```

To try it in Obsidian, copy `main.js`, `manifest.json`, and `styles.css` into your test vault under `.obsidian/plugins/maildrop/`, then enable the plugin in Settings.

## Settings

| Setting | Default |
|---|---|
| Notes folder | `Email/` |
| Attachments folder | `Email/attachments/` |
| Filename template | `{{date}}_{{from}}_{{subject}}` |
| Date format | `YYYY-MM-DD` |
| Extra tag | (empty) |
| Source account | (empty) |
| Include inline images | on |
| Watch folder enabled | off |
| Watch folder path | (empty) |
| Open note after manual import | on |

Filename template variables: `{{date}}`, `{{time}}`, `{{from}}`, `{{subject}}`, `{{messageId}}`.

## License

MIT. See [LICENSE](LICENSE).
