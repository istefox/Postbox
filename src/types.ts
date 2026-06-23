/**
 * Normalized email shape emitted by both parsers (.eml and .msg).
 * The converter and note-builder operate only on this type, so they stay
 * format-agnostic.
 */

export interface EmailAddress {
  name: string;
  address: string;
}

export interface Attachment {
  /** Original filename as declared in the email (may be empty). */
  filename: string;
  /** MIME type, e.g. "application/pdf". */
  mimeType: string;
  /** Raw attachment bytes. */
  content: Uint8Array;
}

export interface InlineImage {
  /** Content-ID referenced by the HTML body via `cid:`. */
  contentId: string;
  /** Suggested filename for the saved image. */
  filename: string;
  mimeType: string;
  content: Uint8Array;
}

export interface ParsedEmail {
  from: EmailAddress | null;
  to: EmailAddress[];
  cc: EmailAddress[];
  subject: string;
  /** Original message date, or null when the header is missing/unparseable. */
  date: Date | null;
  /** RFC Message-ID including angle brackets, used for dedup. */
  messageId: string;
  htmlBody: string | null;
  textBody: string | null;
  attachments: Attachment[];
  inlineImages: InlineImage[];
}
