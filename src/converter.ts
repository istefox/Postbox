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
      // Drop a link that wraps nothing but this image: a wikilink embed nested
      // inside a Markdown link does not render in Obsidian.
      const target = linkWrappingOnly(img) ?? img;
      target.replaceWith(doc.createTextNode(`\n\n${token}\n\n`));
    } else {
      img.remove();
    }
  });

  applyInlineEmphasis(doc);
  flattenLayoutTables(doc);

  return { html: doc.body.innerHTML, embeds };
}

const BLOCKISH = [
  "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption",
  "div", "p", "ul", "ol", "li", "blockquote", "pre", "hr",
  "h1", "h2", "h3", "h4", "h5", "h6",
].join(",");

/**
 * Map bold inline CSS (font-weight bold / >= 600) to Markdown bold. Only
 * elements whose content is purely inline are wrapped, so a bold container that
 * also holds block-level structure is left to its inline descendants. Nested
 * bold candidates are collapsed to the outermost one to avoid stray markers.
 */
function applyInlineEmphasis(doc: Document): void {
  const candidates = Array.from(doc.querySelectorAll("[style]")).filter(
    (el) =>
      isBoldStyle(el.getAttribute("style") ?? "") &&
      !el.querySelector(BLOCKISH) &&
      (el.textContent ?? "").trim().length > 0,
  );
  const candidateSet = new Set(candidates);

  for (const el of candidates) {
    if (hasAncestorIn(el, candidateSet)) continue;
    const strong = doc.createElement("strong");
    while (el.firstChild) strong.appendChild(el.firstChild);
    el.appendChild(strong);
  }
}

function isBoldStyle(style: string): boolean {
  const match = style.toLowerCase().match(/font-weight\s*:\s*([^;]+)/);
  if (!match) return false;
  const value = match[1].trim();
  if (value === "bold" || value === "bolder") return true;
  const weight = parseInt(value, 10);
  return Number.isFinite(weight) && weight >= 600;
}

function hasAncestorIn(el: Element, set: Set<Element>): boolean {
  let cur = el.parentElement;
  while (cur) {
    if (set.has(cur)) return true;
    cur = cur.parentElement;
  }
  return false;
}

/**
 * If the image's only purpose is to be a clickable link (it is the sole
 * meaningful child of an <a>), return that anchor so it can be replaced
 * wholesale; otherwise null.
 */
function linkWrappingOnly(img: Element): Element | null {
  const parent = img.parentElement;
  if (!parent || parent.nodeName !== "A") return null;
  const meaningful = Array.from(parent.childNodes).filter((node) => {
    if (node === img) return false;
    if (node.nodeType === 3) return (node.textContent ?? "").trim().length > 0;
    return true;
  });
  return meaningful.length === 0 ? parent : null;
}

/**
 * Email HTML is overwhelmingly built from layout tables. Turndown's GFM table
 * rule only converts tables whose first row is a header row; every other table
 * is emitted as raw HTML, and Obsidian renders neither embeds nor wikilinks
 * inside raw HTML. Rewrite layout tables into plain block elements so their
 * content (inline image embeds included) survives as real Markdown. Rows become
 * block lines and cells stay inline within a row, so a multi-cell line (an
 * address, a contact row) is not split into separate paragraphs. Genuine data
 * tables (header row present) are left untouched for the GFM rule.
 */
function flattenLayoutTables(doc: Document): void {
  const keep = new Set<Element>();
  doc.querySelectorAll("table").forEach((table) => {
    if (isDataTable(table as HTMLTableElement)) keep.add(table);
  });

  // Retag deepest-first so retagging a parent never reverts a processed child.
  const structural = Array.from(
    doc.querySelectorAll(
      "table, thead, tbody, tfoot, tr, td, th, caption, colgroup, col",
    ),
  ).reverse();

  for (const el of structural) {
    const governing = nearestTable(el);
    if (governing && keep.has(governing)) continue;
    if (el.nodeName === "COL" || el.nodeName === "COLGROUP") {
      el.remove();
      continue;
    }
    if (el.nodeName === "TD" || el.nodeName === "TH") {
      // Cells stay inline; a trailing space keeps adjacent cells from running together.
      const span = retag(el, "span", doc);
      span.after(doc.createTextNode(" "));
      continue;
    }
    retag(el, "div", doc);
  }
}

/** A table is data (worth keeping as a Markdown table) when its first row is all <th>. */
function isDataTable(table: HTMLTableElement): boolean {
  const first = table.rows[0];
  if (!first || first.cells.length === 0) return false;
  return Array.from(first.cells).every((cell) => cell.nodeName === "TH");
}

function nearestTable(el: Element): Element | null {
  let cur: Element | null = el.nodeName === "TABLE" ? el : el.parentElement;
  while (cur) {
    if (cur.nodeName === "TABLE") return cur;
    cur = cur.parentElement;
  }
  return null;
}

function retag(el: Element, tagName: string, doc: Document): Element {
  const replacement = doc.createElement(tagName);
  while (el.firstChild) replacement.appendChild(el.firstChild);
  el.replaceWith(replacement);
  return replacement;
}
