import { PropertyContext, renderProperty } from "./properties";
import type { PostboxSettings } from "./settings";
import type { EmailAddress, ParsedEmail } from "./types";

const MAX_FILENAME_LENGTH = 180;
const ILLEGAL_FILENAME_CHARS = /[\\/:*?"<>|#^[\]]/g;

/** Build the YAML frontmatter block (with delimiters and trailing newline). */
export function buildFrontmatter(
  email: ParsedEmail,
  settings: PostboxSettings,
  sourceFile: string,
  attachmentNames: string[],
): string {
  const lines: string[] = ["---"];
  const ctx = buildPropertyContext(email, settings, sourceFile, attachmentNames);
  const seen = new Set<string>();

  for (const row of settings.properties) {
    const key = row.key.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const rendered = renderProperty(row, ctx);
    if (rendered.kind === "list") {
      lines.push(`${yamlKey(key)}:`);
      for (const item of rendered.items) lines.push(`  - ${yaml(item)}`);
    } else {
      lines.push(`${yamlKey(key)}: ${rendered.bare ? rendered.text : yaml(rendered.text)}`);
    }
  }
  lines.push("---", "");
  return lines.join("\n");
}

/** Split a comma-separated tag setting into clean, unique tags (no leading #). */
export function parseTags(value: string): string[] {
  const tags = value
    .split(",")
    .map((tag) => tag.trim().replace(/^#+/, "").replace(/\s+/g, "-"))
    .filter(Boolean);
  return [...new Set(tags)];
}

/** Values for every variable usable in property templates. */
function buildPropertyContext(
  email: ParsedEmail,
  settings: PostboxSettings,
  sourceFile: string,
  attachmentNames: string[],
): PropertyContext {
  const tags = parseTags(settings.tags);
  const lists: Record<string, string[]> = {
    to: email.to.map(formatAddress).filter(Boolean),
    cc: email.cc.map(formatAddress).filter(Boolean),
    attachments: attachmentNames,
    tags,
  };
  const values: Record<string, string> = {
    from: formatAddress(email.from),
    fromName: email.from?.name ?? "",
    fromAddress: email.from?.address ?? "",
    subject: email.subject,
    date: email.date ? toIso(email.date) : "",
    messageId: email.messageId,
    sourceAccount: settings.sourceAccount,
    sourceFile,
    imported: toIso(new Date()),
  };
  for (const [name, items] of Object.entries(lists)) values[name] = items.join(", ");
  return { values, lists };
}

/** Render the note filename from the template, then sanitize the result. */
export function renderFilename(
  template: string,
  email: ParsedEmail,
  settings: PostboxSettings,
): string {
  const when = email.date ?? new Date();
  const rendered = template
    .replace(/\{\{date\}\}/g, formatDate(when, settings.dateFormat))
    .replace(/\{\{time\}\}/g, formatDate(when, "HHmm"))
    .replace(/\{\{from\}\}/g, slug(addressLabel(email.from)))
    .replace(/\{\{subject\}\}/g, slug(email.subject))
    .replace(/\{\{messageId\}\}/g, shortHash(email.messageId));
  return sanitizeFilename(rendered);
}

/** Per-email prefix for attachment filenames: date + short Message-ID hash. */
export function buildAttachmentPrefix(email: ParsedEmail): string {
  const when = email.date ?? new Date();
  return `${formatDate(when, "YYYYMMDD")}-${shortHash(email.messageId)}`;
}

/** Format a date with a subset of moment-style tokens: YYYY YY MM DD HH mm ss. */
export function formatDate(date: Date, pattern: string): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const tokens: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    YY: String(date.getFullYear()).slice(-2),
    MM: pad(date.getMonth() + 1),
    DD: pad(date.getDate()),
    HH: pad(date.getHours()),
    mm: pad(date.getMinutes()),
    ss: pad(date.getSeconds()),
  };
  return pattern.replace(/YYYY|YY|MM|DD|HH|mm|ss/g, (token) => tokens[token]);
}

/** Strip filesystem-illegal characters, cap length, fall back to "no-subject". */
export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(ILLEGAL_FILENAME_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_FILENAME_LENGTH)
    .trim();
  return cleaned || "no-subject";
}

function formatAddress(address: EmailAddress | null): string {
  if (!address) return "";
  return address.name ? `${address.name} <${address.address}>` : address.address;
}

function formatAddressList(addresses: EmailAddress[]): string {
  return addresses.map((a) => formatAddress(a)).filter(Boolean).join(", ");
}

function addressLabel(address: EmailAddress | null): string {
  if (!address) return "unknown";
  if (address.address) return address.address.split("@")[0];
  return address.name || "unknown";
}

function slug(value: string): string {
  const out = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return out || "untitled";
}

function toIso(date: Date): string {
  return formatDate(date, "YYYY-MM-DDTHH:mm:ss");
}

/** Emit a YAML key bare when it is simple, otherwise double-quoted. */
function yamlKey(key: string): string {
  return /^[A-Za-z0-9_][A-Za-z0-9_-]*$/.test(key) ? key : yaml(key);
}

function yaml(value: string): string {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
  return `"${escaped}"`;
}

function shortHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}
