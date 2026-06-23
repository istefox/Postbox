import type { ParsedEmail } from "../types";

/**
 * Parse a raw .eml (MIME) file into the normalized ParsedEmail shape.
 *
 * Implementation wraps `postal-mime`; not implemented yet (scaffold stage).
 */
export async function parseEml(_data: ArrayBuffer): Promise<ParsedEmail> {
  throw new Error("parseEml: not implemented");
}
