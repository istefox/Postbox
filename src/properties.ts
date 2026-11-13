/**
 * Frontmatter property model: a user-editable list of rows, each with a key,
 * a value template ({{variables}}) and a type. Pure functions only, so this
 * module is testable without Obsidian.
 */

export type PropertyType = "text" | "list" | "date";

export interface PropertyRow {
  /** Stable identifier, used only for the protected Message-ID row. */
  id: string;
  /** Frontmatter key written to the note. */
  key: string;
  /** Value template, e.g. "{{from}}" or "Mail from {{fromName}}". */
  value: string;
  type: PropertyType;
}

/** Id of the row the duplicate check relies on; it can be renamed but not removed. */
export const MESSAGE_ID_ROW = "message-id";

export const PROPERTY_TYPES: PropertyType[] = ["text", "list", "date"];

/** Variables available in value templates, with a short description for the settings UI. */
export const PROPERTY_VARIABLES: { name: string; description: string }[] = [
  { name: "from", description: "Sender, e.g. Jane <jane@example.com>" },
  { name: "fromName", description: "Sender name" },
  { name: "fromAddress", description: "Sender email address" },
  { name: "to", description: "Recipients" },
  { name: "cc", description: "Cc recipients" },
  { name: "subject", description: "Subject" },
  { name: "date", description: "Message date (ISO 8601)" },
  { name: "messageId", description: "Message-ID" },
  { name: "attachments", description: "Attachment filenames" },
  { name: "tags", description: "Tags from the Tags setting" },
  { name: "sourceAccount", description: "Source account setting" },
  { name: "sourceFile", description: "Path of the imported file" },
  { name: "imported", description: "Import time (ISO 8601)" },
];

/** Values for every variable: a joined string, plus the item list for list variables. */
export interface PropertyContext {
  values: Record<string, string>;
  lists: Record<string, string[]>;
}

export type RenderedProperty =
  | { kind: "scalar"; text: string; bare: boolean }
  | { kind: "list"; items: string[] };

/** The default rows reproduce the frontmatter written before properties were configurable. */
export function defaultProperties(): PropertyRow[] {
  return [
    { id: "from", key: "from", value: "{{from}}", type: "text" },
    { id: "to", key: "to", value: "{{to}}", type: "text" },
    { id: "cc", key: "cc", value: "{{cc}}", type: "text" },
    { id: "subject", key: "subject", value: "{{subject}}", type: "text" },
    { id: "date", key: "date", value: "{{date}}", type: "text" },
    { id: MESSAGE_ID_ROW, key: "message-id", value: "{{messageId}}", type: "text" },
    { id: "attachments", key: "attachments", value: "{{attachments}}", type: "list" },
    { id: "tags", key: "tags", value: "{{tags}}", type: "list" },
    { id: "source-account", key: "source-account", value: "{{sourceAccount}}", type: "text" },
    { id: "source-file", key: "source-file", value: "{{sourceFile}}", type: "text" },
  ];
}

/** A new empty row for the "Add property" button. */
export function newPropertyRow(): PropertyRow {
  return { id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, key: "", value: "", type: "text" };
}

/**
 * Validate stored rows. Falls back to the defaults when nothing usable is stored,
 * and guarantees the protected Message-ID row exists with its fixed value.
 */
export function mergeProperties(stored: unknown): PropertyRow[] {
  if (!Array.isArray(stored)) return defaultProperties();

  const rows: PropertyRow[] = [];
  const usedIds = new Set<string>();
  for (const entry of stored as unknown[]) {
    if (typeof entry !== "object" || entry === null) continue;
    const raw = entry as Partial<PropertyRow>;
    if (typeof raw.key !== "string" || typeof raw.value !== "string") continue;
    let id = typeof raw.id === "string" && raw.id ? raw.id : newPropertyRow().id;
    if (usedIds.has(id)) id = newPropertyRow().id;
    usedIds.add(id);
    const type = PROPERTY_TYPES.includes(raw.type as PropertyType)
      ? (raw.type as PropertyType)
      : "text";
    rows.push({ id, key: raw.key, value: raw.value, type });
  }

  const idRow = rows.find((r) => r.id === MESSAGE_ID_ROW);
  if (idRow) {
    idRow.value = "{{messageId}}";
    idRow.type = "text";
    if (!idRow.key.trim()) idRow.key = "message-id";
  } else {
    rows.unshift({ id: MESSAGE_ID_ROW, key: "message-id", value: "{{messageId}}", type: "text" });
  }
  return rows;
}

/** Frontmatter key the duplicate check reads. */
export function messageIdKey(rows: PropertyRow[]): string {
  return rows.find((r) => r.id === MESSAGE_ID_ROW)?.key.trim() || "message-id";
}

const VARIABLE = /\{\{\s*(\w+)\s*\}\}/g;
const SINGLE_VARIABLE = /^\s*\{\{\s*(\w+)\s*\}\}\s*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/;

/** Replace {{variables}} in a template; unknown variables are left as written. */
export function renderTemplate(template: string, ctx: PropertyContext): string {
  return template.replace(VARIABLE, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(ctx.values, name) ? ctx.values[name] : match,
  );
}

/** Render one row. A list row made of a single list variable keeps its items separate. */
export function renderProperty(row: PropertyRow, ctx: PropertyContext): RenderedProperty {
  if (row.type === "list") {
    const single = SINGLE_VARIABLE.exec(row.value);
    if (single && Object.prototype.hasOwnProperty.call(ctx.lists, single[1])) {
      return { kind: "list", items: ctx.lists[single[1]] };
    }
    const text = renderTemplate(row.value, ctx).trim();
    return { kind: "list", items: text ? [text] : [] };
  }

  const text = renderTemplate(row.value, ctx);
  // Dates are written unquoted so Obsidian and Dataview read them as dates.
  return { kind: "scalar", text, bare: row.type === "date" && ISO_DATE.test(text) };
}
