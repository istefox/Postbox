import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import type { ParsedEmail } from "./types";

const PLACEHOLDER_PREFIX = "POSTBOXINLINE";

let turndown: TurndownService | null = null;

function service(): TurndownService {
  if (!turndown) {
    turndown = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-",
      emDelimiter: "*",
    });
    turndown.use(gfm);
    turndown.remove(["style", "script", "head"]);
  }
  return turndown;
}

/** Convert an HTML fragment into Markdown. */
export function htmlToMarkdown(html: string): string {
  return service().turndown(html);
}

/**
 * Build the note body Markdown from a parsed email. Converts the HTML body
 * (or falls back to plain text) and rewrites inline cid: image references to
 * Obsidian embeds using the provided contentId -> vault path map. Inline
 * images with no matching saved file are dropped.
 */
export function assembleBody(
  email: ParsedEmail,
  inlineImagePaths: Map<string, string>,
): string {
  if (email.htmlBody) {
    const { html, embeds } = injectInlinePlaceholders(
      email.htmlBody,
      inlineImagePaths,
    );
    let markdown = htmlToMarkdown(html);
    embeds.forEach((embed, token) => {
      markdown = markdown.split(token).join(embed);
    });
    return markdown.trim();
  }
  if (email.textBody) {
    return email.textBody.replace(/\r\n/g, "\n").trim();
  }
  return "";
}

function injectInlinePlaceholders(
  html: string,
  inlineImagePaths: Map<string, string>,
): { html: string; embeds: Map<string, string> } {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const embeds = new Map<string, string>();
  let index = 0;

  doc.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src") ?? "";
    if (!src.toLowerCase().startsWith("cid:")) return;

    const cid = src.slice(4).replace(/^<|>$/g, "").trim();
    const path = inlineImagePaths.get(cid);
    if (path) {
      const token = `${PLACEHOLDER_PREFIX}${index++}`;
      embeds.set(token, `![[${path}]]`);
      img.replaceWith(doc.createTextNode(`\n\n${token}\n\n`));
    } else {
      img.remove();
    }
  });

  return { html: doc.body.innerHTML, embeds };
}
