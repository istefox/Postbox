import { App, TFile } from "obsidian";

/**
 * Find an existing note whose frontmatter message-id matches, via the
 * MetadataCache. Returns the first match, or null if none exists.
 */
export function findExistingByMessageId(
  app: App,
  messageId: string,
): TFile | null {
  const target = messageId.trim();
  if (!target) return null;

  for (const file of app.vault.getMarkdownFiles()) {
    const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
    const value: unknown = frontmatter?.["message-id"];
    if (typeof value === "string" && value.trim() === target) return file;
  }
  return null;
}
