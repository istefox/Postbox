import { App, TFile } from "obsidian";

/**
 * Find an existing note whose frontmatter property `key` (default message-id) matches, via the
 * MetadataCache. Returns the first match, or null if none exists.
 */
export function findExistingByMessageId(
  app: App,
  messageId: string,
  key = "message-id",
): TFile | null {
  const target = messageId.trim();
  if (!target) return null;

  for (const file of app.vault.getMarkdownFiles()) {
    const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
    const value: unknown = frontmatter?.[key];
    if (typeof value === "string" && value.trim() === target) return file;
  }
  return null;
}
