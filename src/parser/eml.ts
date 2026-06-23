import PostalMime, { Address, Attachment as PmAttachment } from "postal-mime";
import type {
  Attachment,
  EmailAddress,
  InlineImage,
  ParsedEmail,
} from "../types";

/** Parse a raw .eml (MIME) file into the normalized ParsedEmail shape. */
export async function parseEml(data: ArrayBuffer): Promise<ParsedEmail> {
  const email = await new PostalMime().parse(data);

  const attachments: Attachment[] = [];
  const inlineImages: InlineImage[] = [];

  for (const part of email.attachments) {
    const cid = stripAngleBrackets(part.contentId);
    if (cid && isInline(part)) {
      inlineImages.push({
        contentId: cid,
        filename: part.filename || `${cid}`,
        mimeType: part.mimeType,
        content: toUint8(part.content),
      });
    } else {
      attachments.push({
        filename: part.filename || "attachment",
        mimeType: part.mimeType,
        content: toUint8(part.content),
      });
    }
  }

  return {
    from: firstAddress(flattenAddresses(email.from ? [email.from] : [])),
    to: flattenAddresses(email.to ?? []),
    cc: flattenAddresses(email.cc ?? []),
    subject: email.subject ?? "",
    date: email.date ? new Date(email.date) : null,
    messageId: email.messageId ?? "",
    htmlBody: email.html ?? null,
    textBody: email.text ?? null,
    attachments,
    inlineImages,
  };
}

function isInline(part: PmAttachment): boolean {
  return part.disposition === "inline" || part.related === true;
}

function flattenAddresses(addresses: Address[]): EmailAddress[] {
  const out: EmailAddress[] = [];
  for (const addr of addresses) {
    if (addr.address !== undefined) {
      out.push({ name: addr.name ?? "", address: addr.address });
    } else if (addr.group) {
      for (const member of addr.group) {
        out.push({ name: member.name ?? "", address: member.address });
      }
    }
  }
  return out;
}

function firstAddress(addresses: EmailAddress[]): EmailAddress | null {
  return addresses.length > 0 ? addresses[0] : null;
}

function stripAngleBrackets(value: string | undefined): string {
  return (value ?? "").replace(/^<|>$/g, "").trim();
}

function toUint8(content: ArrayBuffer | Uint8Array | string): Uint8Array {
  if (typeof content === "string") {
    return new TextEncoder().encode(content);
  }
  return content instanceof Uint8Array ? content : new Uint8Array(content);
}
