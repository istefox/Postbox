import type { Vault } from "obsidian";
import type { Attachment, InlineImage } from "./types";

export interface WrittenAttachment {
  /** Vault-relative path of the written file. */
  path: string;
  /** Display name used for links in the note. */
  name: string;
}

/**
 * Write attachments and inline images to the configured attachments folder,
 * applying a per-email unique prefix and resolving filename collisions.
 *
 * Returns the written attachments and a Content-ID -> path map for inline
 * images, so the converter can resolve `cid:` references.
 * Not implemented yet (scaffold stage).
 */
export async function writeAttachments(
  _vault: Vault,
  _attachmentsFolder: string,
  _prefix: string,
  _attachments: Attachment[],
  _inlineImages: InlineImage[],
): Promise<{ written: WrittenAttachment[]; inlinePaths: Map<string, string> }> {
  throw new Error("writeAttachments: not implemented");
}
