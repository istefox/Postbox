import type { App, TFile } from "obsidian";

/**
 * Look up an existing note with the given Message-ID in its frontmatter, using
 * the MetadataCache. Returns the matching file, or null if none exists.
 * Not implemented yet (scaffold stage).
 */
export function findExistingByMessageId(
  _app: App,
  _messageId: string,
): TFile | null {
  throw new Error("findExistingByMessageId: not implemented");
}
