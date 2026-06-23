import MsgReader, { FieldsData } from "@kenjiuno/msgreader";
import type {
  Attachment,
  EmailAddress,
  InlineImage,
  ParsedEmail,
} from "../types";

/** Parse a raw .msg (Outlook CFB/OLE) file into the normalized ParsedEmail shape. */
export async function parseMsg(data: ArrayBuffer): Promise<ParsedEmail> {
  const reader = new MsgReader(data);
  const msg = reader.getFileData();

  const attachments: Attachment[] = [];
  const inlineImages: InlineImage[] = [];

  for (const field of msg.attachments ?? []) {
    if (field.innerMsgContent) continue;
    const part = reader.getAttachment(field);
    const cid = (field.pidContentId ?? "").trim();
    if (cid) {
      inlineImages.push({
        contentId: cid,
        filename: part.fileName || cid,
        mimeType: guessMimeType(part.fileName),
        content: part.content,
      });
    } else {
      attachments.push({
        filename: part.fileName || "attachment",
        mimeType: guessMimeType(part.fileName),
        content: part.content,
      });
    }
  }

  return {
    from: sender(msg),
    to: recipients(msg, "to"),
    cc: recipients(msg, "cc"),
    subject: msg.subject ?? "",
    date: msg.messageDeliveryTime ? new Date(msg.messageDeliveryTime) : null,
    messageId: msg.messageId ?? "",
    htmlBody: msg.bodyHtml ?? null,
    textBody: msg.body ?? null,
    attachments,
    inlineImages,
  };
}

function sender(msg: FieldsData): EmailAddress | null {
  if (!msg.senderEmail && !msg.senderName) return null;
  return { name: msg.senderName ?? "", address: msg.senderEmail ?? "" };
}

function recipients(msg: FieldsData, type: "to" | "cc"): EmailAddress[] {
  return (msg.recipients ?? [])
    .filter((r) => (r.recipType ?? "to") === type)
    .map((r) => ({ name: r.name ?? "", address: r.email ?? "" }));
}

function guessMimeType(filename: string | undefined): string {
  const ext = (filename ?? "").split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    bmp: "image/bmp",
    webp: "image/webp",
    svg: "image/svg+xml",
    pdf: "application/pdf",
  };
  return map[ext] ?? "application/octet-stream";
}
