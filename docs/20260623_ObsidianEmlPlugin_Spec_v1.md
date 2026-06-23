# Concept-to-Code Spec — Obsidian Plugin "EML/MSG to Markdown"

> Documento di specifica completo da passare a `/concept-to-code`.
> Tutte le decisioni di prodotto sono congelate. Niente assunzioni implicite: dove serve un default, e indicato esplicitamente.
> UI strings, codice, commenti e documentazione del plugin: in **inglese** (target community store).

---

## 1. Obiettivo

Plugin Obsidian che importa file email `.eml` e `.msg` e li converte in note Markdown native, con:
- corpo HTML convertito in Markdown pulito,
- allegati estratti su disco e linkati nella nota,
- immagini inline (CID) renderizzate nel punto corretto del testo,
- frontmatter YAML strutturato per Dataview,
- import sia manuale sia automatico (watch-folder).

Caso d'uso primario: gestire le email che arrivano su Outlook portandole nel vault come note consultabili e collegabili.

---

## 2. Scope

### In scope
- Parsing `.eml` (standard MIME).
- Parsing `.msg` (formato binario Outlook CFB/OLE).
- Conversione corpo HTML → Markdown.
- Estrazione allegati + immagini inline.
- Generazione nota con frontmatter.
- Import manuale (comando + context menu file explorer).
- Import automatico via watch-folder.
- Deduplica via Message-ID.
- Settings tab con percorsi e template configurabili.

### Out of scope (v1)
- Connessione diretta a Outlook/IMAP/Exchange. Il plugin lavora su file `.eml`/`.msg` gia presenti su disco.
- Invio email.
- Supporto mobile (vedi vincoli).
- Sincronizzazione bidirezionale.
- Thread/conversazioni aggregate (ogni email = una nota).

---

## 3. Vincoli tecnici

- **Desktop only**: `isDesktopOnly: true` nel manifest. La watch-folder usa il filesystem Node (`fs`), non disponibile su mobile.
- **Community store compliance**: nessun codice offuscato, nessuna chiamata di rete non dichiarata, nessun telemetry. Tutto offline e locale.
- **Stack**: TypeScript + esbuild (bundle singolo `main.js`).
- **Librerie suggerite** (da validare in fase di build):
  - `.eml` parsing: `postal-mime` (parser MIME browser-friendly, gestisce header, body, allegati, inline CID).
  - `.msg` parsing: `@kenjiuno/msgreader` (o equivalente puro-JS, no dipendenze native).
  - HTML → Markdown: `turndown` (+ eventuale `turndown-plugin-gfm` per tabelle).
- API Obsidian: usare `Vault`, `MetadataCache`, `addCommand`, `registerEvent`, `PluginSettingTab`, `Notice`. Niente accesso a path assoluti fuori dal vault salvo la watch-folder configurata.

---

## 4. Feature dettagliate

### 4.1 Formati di input
- Supporto `.eml` **e** `.msg`.
- Riconoscimento per estensione. Parser selezionato di conseguenza.
- In caso di parse error: nessuna nota creata, `Notice` con nome file e motivo, log in console. Il file sorgente resta intatto.

### 4.2 Conversione corpo
- Priorita: se presente parte HTML → converti in Markdown via Turndown.
- Se solo plain text → usa il testo cosi com'e (preserva i ritorni a capo).
- Markdown risultante: link mantenuti, grassetti/corsivi, liste, tabelle (GFM). Pulizia di stili inline e tag vuoti.

### 4.3 Immagini inline (CID)
- Le immagini referenziate via `cid:` nel corpo HTML vanno **estratte e renderizzate inline** nel punto corretto del Markdown (`![[...]]` o `![](path)` verso il file salvato).
- Salvate nella cartella allegati (vedi 4.5).

### 4.4 Allegati
- Tutti gli allegati non-inline estratti su disco nella cartella allegati configurata.
- Linkati nella nota in una sezione dedicata (es. `## Attachments`) con wikilink/embed.
- Nome file allegato sanitizzato; in caso di collisione, suffisso univoco.

### 4.5 Organizzazione file (configurabile)
- Due percorsi **separati e configurabili** nelle settings:
  - Note folder (default: `Email/`).
  - Attachments folder (default: `Email/attachments/`).
- Default sensati pre-popolati. Cartelle create se mancanti.
- Prefisso univoco sugli allegati per evitare collisioni tra email diverse (es. basato su data + slug oggetto o su hash breve del Message-ID).

### 4.6 Naming nota (template configurabile)
- Pattern impostabile nelle settings con variabili:
  - `{{date}}` (formato data configurabile, default `YYYY-MM-DD`),
  - `{{time}}` (`HHmm`),
  - `{{from}}` (mittente, slug),
  - `{{subject}}` (oggetto, slug),
  - `{{messageId}}` (hash breve).
- Default proposto: `{{date}}_{{from}}_{{subject}}`.
- Sanitizzazione: rimozione caratteri illegali filesystem, troncamento lunghezza massima, gestione oggetti vuoti (fallback `no-subject`).

### 4.7 Frontmatter YAML
Campi da includere (tutti selezionati):
- **Header base**: `from`, `to`, `cc`, `subject`, `date`, `message-id`.
- **Allegati**: `attachments:` lista nomi file (per Dataview).
- **Tag automatici**: `tags:` con tag fisso `email` + tag aggiuntivo configurabile nelle settings (default vuoto/disattivabile).
- **Source/account**: `source-account` (casella/destinatario di provenienza) + `source-file` (percorso del `.eml`/`.msg` originale).
- Date in formato ISO 8601 compatibile Dataview.
- Valori con caratteri speciali correttamente quotati in YAML.

### 4.8 Deduplica
- **Dedup via Message-ID**: prima di creare la nota, cerca nel vault una nota esistente con lo stesso `message-id` nel frontmatter (via MetadataCache).
- Se esiste → salta import, nessuna nota duplicata. In watch-folder: silenzioso o conteggiato nel report. In manuale: `Notice` "already imported".

### 4.9 Import manuale
- Comando palette: "Import email file (.eml/.msg)" → file picker di sistema.
- Context menu nel file explorer Obsidian su file `.eml`/`.msg` presenti nel vault → "Import as Markdown note".
- Dopo import manuale riuscito: **apri la nota** generata.

### 4.10 Import automatico (watch-folder)
- Sorveglia una cartella esterna configurata (es. dove Outlook esporta gli `.eml`/`.msg`).
- Attivabile/disattivabile nelle settings; path configurabile.
- All'avvio Obsidian: scan iniziale della cartella + watch live sui nuovi file.
- Ogni nuovo file → import automatico con dedup.
- Dopo import via watch: **nessuna apertura nota**, solo `Notice` con conteggio importati.
- Debounce/coda per evitare race su file ancora in scrittura.

### 4.11 File sorgente
- **Lasciato dov'e** dopo l'import. Nessuno spostamento, nessuna cancellazione.
- La dedup via Message-ID impedisce la re-importazione dei file gia processati nella watch-folder.

---

## 5. Settings (tutte in inglese)

| Setting | Tipo | Default |
|---|---|---|
| Notes folder | path nel vault | `Email/` |
| Attachments folder | path nel vault | `Email/attachments/` |
| Filename template | string | `{{date}}_{{from}}_{{subject}}` |
| Date format | string | `YYYY-MM-DD` |
| Extra tag | string | (vuoto) |
| Include inline images | toggle | on |
| Watch folder enabled | toggle | off |
| Watch folder path | path filesystem | (vuoto) |
| Open note after manual import | toggle | on |

Validazione: path watch-folder esistente; template non vuoto; warning se cartelle note/allegati coincidono.

---

## 6. UX

- Notifiche `Notice` concise: successo (con nome nota), skip duplicato, errore con motivo.
- Watch-folder: notifica aggregata ("Imported N emails").
- Nessun blocco UI su import batch: operazioni async.
- Sezioni nota generata, ordine: frontmatter → titolo (oggetto) → metadati leggibili (From/To/Date) → corpo → `## Attachments`.

---

## 7. Struttura nota generata (esempio target)

```markdown
---
from: "Mario Rossi <mario@acme.it>"
to: "stefano@stefer.it"
cc: ""
subject: "Richiesta offerta antivibranti"
date: 2026-06-23T14:30:00
message-id: "<abc123@mail.acme.it>"
attachments:
  - 20260623-richiesta_datasheet.pdf
tags:
  - email
source-account: "stefano@stefer.it"
source-file: "C:/Outlook-export/richiesta.eml"
---

# Richiesta offerta antivibranti

**From:** Mario Rossi <mario@acme.it>
**To:** stefano@stefer.it
**Date:** 2026-06-23 14:30

Buongiorno,
in allegato il datasheet della macchina...

![[20260623-signature_logo.png]]

## Attachments
- [[20260623-richiesta_datasheet.pdf]]
```

---

## 8. Struttura repo

```
obsidian-eml-to-md/
├── manifest.json          # id, name, version, minAppVersion, isDesktopOnly: true
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── versions.json
├── styles.css
├── README.md
├── LICENSE
└── src/
    ├── main.ts            # Plugin lifecycle, commands, context menu, watcher registration
    ├── settings.ts        # Interface + PluginSettingTab
    ├── parser/
    │   ├── eml.ts         # postal-mime wrapper
    │   └── msg.ts         # msgreader wrapper
    ├── converter.ts       # HTML→MD, inline CID handling, body assembly
    ├── note-builder.ts    # frontmatter, filename template, sanitization
    ├── attachments.ts     # write attachments, collision handling, prefix
    ├── dedup.ts           # Message-ID lookup via MetadataCache
    └── watcher.ts         # watch-folder scan + live watch + queue
```

---

## 9. Criteri di accettazione

1. Import manuale di un `.eml` con allegato PDF + immagine inline produce: nota con frontmatter completo, corpo in Markdown, PDF linkato in `## Attachments`, immagine inline renderizzata nel corpo. Nota aperta a fine import.
2. Import manuale di un `.msg` Outlook produce lo stesso risultato dell'`.eml`.
3. Re-import dello stesso file → nessuna nota duplicata (skip via Message-ID).
4. Watch-folder attiva: nuovo file nella cartella → nota creata in automatico senza aprire la nota, con Notice di conteggio.
5. Filename template e percorsi configurati vengono rispettati.
6. File sorgente mai modificato o spostato.
7. Build pulita con esbuild, nessun errore TypeScript, `isDesktopOnly: true`.
8. Nessuna chiamata di rete; conformita guidelines community store.

---

## 10. Decisioni congelate (riepilogo)

| Tema | Decisione |
|---|---|
| Formati | `.eml` + `.msg` |
| Trigger import | Manuale (comando + context menu) **e** watch-folder |
| Corpo | HTML → Markdown |
| Allegati | Estratti su disco + linkati nella nota |
| Immagini inline | Estratte e renderizzate inline |
| Naming nota | Template configurabile (`{{date}}_{{from}}_{{subject}}` default) |
| Frontmatter | Header base + allegati + tag automatici + source/account |
| Piattaforma | Solo desktop |
| Duplicati | Dedup via Message-ID |
| Organizzazione file | Percorsi note/allegati configurabili |
| Lingua UI | Inglese |
| File sorgente | Lasciato dov'e |
| Post-import | Apri nota solo su import manuale |
| Distribuzione | Community store ufficiale |
```
