# Postbox

Obsidian plugin that imports `.eml` and `.msg` email files and turns them into native Markdown notes: the HTML body becomes clean Markdown, attachments are saved to disk and linked, inline images render in place, and a structured YAML frontmatter makes every note Dataview-friendly.

Desktop only. The plugin works on `.eml`/`.msg` files already on disk, with no Outlook, IMAP, or Exchange connection.

## Installation

From Obsidian (once approved in the community store): open Settings, go to Community plugins, browse, search for "Postbox", install it, then enable it.

Manual install: download `main.js`, `manifest.json`, and `styles.css` from the latest [release](https://github.com/istefox/Postbox/releases), put them in your vault under `.obsidian/plugins/postbox/`, then enable the plugin in Settings.

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

To try it in Obsidian, copy `main.js`, `manifest.json`, and `styles.css` into your test vault under `.obsidian/plugins/postbox/`, then enable the plugin in Settings.

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
| Frontmatter properties | all on, default names |

### Frontmatter properties

The **Frontmatter properties** section lists every property written to a note. For each row you can edit the key and the value template, pick a type (text, list, or date) from the icon, drag the handle to reorder, and remove the row. **Add property** appends a new row, and **Reset to defaults** restores the built-in list. The defaults produce the same frontmatter as earlier versions.

Value templates can use these variables: `{{from}}`, `{{fromName}}`, `{{fromAddress}}`, `{{to}}`, `{{cc}}`, `{{subject}}`, `{{date}}`, `{{messageId}}`, `{{attachments}}`, `{{tags}}`, `{{sourceAccount}}`, `{{sourceFile}}`, `{{imported}}`. A list row whose value is a single list variable (such as `{{to}}`) becomes a YAML list; otherwise it holds one item. Date rows are written unquoted when the value is an ISO date.

The Message-ID row can be renamed but not removed or edited, because it is used to skip duplicates. Changes apply to newly imported notes only; notes written under a different Message-ID key are not recognized as duplicates.

Filename template variables: `{{date}}`, `{{time}}`, `{{from}}`, `{{subject}}`, `{{messageId}}`.

## License

MIT. See [LICENSE](LICENSE).
