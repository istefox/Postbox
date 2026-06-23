import type { ParsedEmail } from "../types";

/**
 * Parse a raw .msg (Outlook CFB/OLE) file into the normalized ParsedEmail shape.
 *
 * Implementation wraps `@kenjiuno/msgreader`; not implemented yet (scaffold stage).
 */
export async function parseMsg(_data: ArrayBuffer): Promise<ParsedEmail> {
  throw new Error("parseMsg: not implemented");
}
