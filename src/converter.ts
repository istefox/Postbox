import type { ParsedEmail } from "./types";

/**
 * Convert an HTML email body into clean Markdown.
 *
 * Implementation uses `turndown` + `turndown-plugin-gfm`; not implemented yet.
 */
export function htmlToMarkdown(_html: string): string {
  throw new Error("htmlToMarkdown: not implemented");
}

/**
 * Assemble the note body Markdown from a parsed email: convert the HTML body
 * (or fall back to plain text) and resolve inline CID image references to links
 * pointing at the saved image files.
 *
 * `inlineImagePaths` maps a Content-ID to the vault path of its saved image.
 * Not implemented yet (scaffold stage).
 */
export function assembleBody(
  _email: ParsedEmail,
  _inlineImagePaths: Map<string, string>,
): string {
  throw new Error("assembleBody: not implemented");
}
