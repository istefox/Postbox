import { normalizePath, Vault } from "obsidian";
import { ensureFolder } from "./utils";
import type { Attachment, InlineImage } from "./types";

export interface WrittenAttachment {
  /** Vault-relative path of the written file. */
  path: string;
  /** Display name used for links in the note. */
  name: string;
}

const ILLEGAL_CHARS = /[\\/:*?"<>|#^[\]]/g;

/**
 * Write attachments and inline images to the attachments folder, applying a
 * per-email prefix and resolving filename collisions. Returns the written
 * attachments and a contentId -> vault path map for inline images.
 */
export async function writeAttachments(
  vault: Vault,
  attachmentsFolder: string,
  prefix: string,
  attachments: Attachment[],
  inlineImages: InlineImage[],
): Promise<{ written: WrittenAttachment[]; inlinePaths: Map<string, string> }> {
  const folder = normalizePath(attachmentsFolder);
  await ensureFolder(vault, folder);

  const used = new Set<string>();
  const written: WrittenAttachment[] = [];
  const inlinePaths = new Map<string, string>();

  for (const image of inlineImages) {
    const name = uniqueName(`${prefix}-${clean(image.filename)}`, folder, vault, used);
    const path = `${folder}/${name}`;
    await vault.createBinary(path, toArrayBuffer(image.content));
    inlinePaths.set(image.contentId, path);
  }

  for (const attachment of attachments) {
    const name = uniqueName(`${prefix}-${clean(attachment.filename)}`, folder, vault, used);
    const path = `${folder}/${name}`;
    await vault.createBinary(path, toArrayBuffer(attachment.content));
    written.push({ path, name });
  }

  return { written, inlinePaths };
}

function uniqueName(
  base: string,
  folder: string,
  vault: Vault,
  used: Set<string>,
): string {
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : "";

  let candidate = base;
  let counter = 1;
  while (used.has(candidate) || vault.getAbstractFileByPath(`${folder}/${candidate}`)) {
    candidate = `${stem}-${counter++}${ext}`;
  }
  used.add(candidate);
  return candidate;
}

function clean(filename: string): string {
  const cleaned = filename.replace(ILLEGAL_CHARS, "_").replace(/\s+/g, "_").trim();
  return cleaned || "file";
}

function toArrayBuffer(content: Uint8Array): ArrayBuffer {
  return content.byteOffset === 0 && content.byteLength === content.buffer.byteLength
    ? (content.buffer as ArrayBuffer)
    : (content.slice().buffer as ArrayBuffer);
}
