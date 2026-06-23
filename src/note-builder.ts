import type { MaildropSettings } from "./settings";
import type { ParsedEmail } from "./types";

/**
 * Build the YAML frontmatter block (including trailing newlines) for a note.
 * Not implemented yet (scaffold stage).
 */
export function buildFrontmatter(
  _email: ParsedEmail,
  _settings: MaildropSettings,
  _sourceFile: string,
  _attachmentNames: string[],
): string {
  throw new Error("buildFrontmatter: not implemented");
}

/**
 * Render the note filename from the configured template, substituting
 * {{date}}, {{time}}, {{from}}, {{subject}}, {{messageId}}.
 * The result is not yet sanitized. Not implemented yet (scaffold stage).
 */
export function renderFilename(
  _template: string,
  _email: ParsedEmail,
  _settings: MaildropSettings,
): string {
  throw new Error("renderFilename: not implemented");
}

/**
 * Sanitize a filename: strip filesystem-illegal characters, cap length, and
 * fall back to "no-subject" when the result is empty.
 * Not implemented yet (scaffold stage).
 */
export function sanitizeFilename(_name: string): string {
  throw new Error("sanitizeFilename: not implemented");
}
