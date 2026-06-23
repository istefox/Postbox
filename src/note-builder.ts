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
  lines.push(`from: ${yaml(formatAddress(email.from))}`);
  lines.push(`to: ${yaml(formatAddressList(email.to))}`);
  lines.push(`cc: ${yaml(formatAddressList(email.cc))}`);
  lines.push(`subject: ${yaml(email.subject)}`);
  lines.push(`date: ${yaml(email.date ? toIso(email.date) : "")}`);
  lines.push(`message-id: ${yaml(email.messageId)}`);

  lines.push("attachments:");
  for (const name of attachmentNames) lines.push(`  - ${yaml(name)}`);

  lines.push("tags:");
  lines.push("  - email");
  if (settings.extraTag.trim()) lines.push(`  - ${yaml(settings.extraTag.trim())}`);

  lines.push(`source-account: ${yaml(settings.sourceAccount)}`);
  lines.push(`source-file: ${yaml(sourceFile)}`);
  lines.push("---", "");
  return lines.join("\n");
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
