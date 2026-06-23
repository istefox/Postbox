import { readFile } from "fs/promises";
import {
  Menu,
  Notice,
  normalizePath,
  Plugin,
  TAbstractFile,
  TFile,
} from "obsidian";
import {
  DEFAULT_SETTINGS,
  PostboxSettings,
  PostboxSettingTab,
} from "./settings";
import { parseEml } from "./parser/eml";
import { parseMsg } from "./parser/msg";
import { assembleBody } from "./converter";
import {
  buildAttachmentPrefix,
  buildFrontmatter,
  formatDate,
  renderFilename,
} from "./note-builder";
import { writeAttachments } from "./attachments";
import { findExistingByMessageId } from "./dedup";
import { ensureFolder } from "./utils";
import { FolderWatcher } from "./watcher";
import type { ParsedEmail } from "./types";

const SUPPORTED_EXTENSIONS = ["eml", "msg"];

type ImportResult =
  | { status: "created"; file: TFile }
  | { status: "duplicate"; file: TFile }
  | { status: "error"; reason: string };

export default class PostboxPlugin extends Plugin {
  settings: PostboxSettings = DEFAULT_SETTINGS;
  private watcher: FolderWatcher | null = null;
  private watchImported = 0;
  private watchNoticeTimer: ReturnType<typeof setTimeout> | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addSettingTab(new PostboxSettingTab(this.app, this));

    this.addCommand({
      id: "import-email-file",
      name: "Import email file (.eml/.msg)",
      callback: () => this.importViaPicker(),
    });

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu: Menu, file: TAbstractFile) => {
        if (file instanceof TFile && SUPPORTED_EXTENSIONS.includes(file.extension)) {
          menu.addItem((item) => {
            item
              .setTitle("Import as Markdown note")
              .setIcon("mail")
              .onClick(() => this.importVaultFile(file));
          });
        }
      }),
    );

    this.startWatcherIfEnabled();
  }

  onunload(): void {
    this.stopWatcher();
    if (this.watchNoticeTimer) {
      clearTimeout(this.watchNoticeTimer);
      this.watchNoticeTimer = null;
    }
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.startWatcherIfEnabled();
  }

  startWatcherIfEnabled(): void {
    this.stopWatcher();
    if (this.settings.watchFolderEnabled && this.settings.watchFolderPath) {
      this.watcher = new FolderWatcher(this.settings.watchFolderPath, (path) =>
        this.handleWatchedFile(path),
      );
      void this.watcher
        .start()
        .catch((err) =>
          new Notice(`Postbox: watch folder error (${describe(err)})`),
        );
    }
  }

  private stopWatcher(): void {
    this.watcher?.stop();
    this.watcher = null;
  }

  private async importViaPicker(): Promise<void> {
    const files = await pickFiles();
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const sourcePath = filePath(file);
      const result = await this.importEmail(bytes, sourcePath, file.name);
      this.notifyManual(file.name, result);
      if (result.status === "created") {
        await this.openNote(result.file);
      }
    }
  }

  private async importVaultFile(file: TFile): Promise<void> {
    const bytes = await this.app.vault.readBinary(file);
    const result = await this.importEmail(bytes, file.path, file.name);
    this.notifyManual(file.name, result);
    if (result.status === "created") await this.openNote(result.file);
  }

  private async handleWatchedFile(path: string): Promise<void> {
    const buffer = await readFile(path);
    const bytes = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;
    const result = await this.importEmail(bytes, path, basename(path));
    if (result.status === "created") this.scheduleWatchNotice();
  }

  /** Core import pipeline. Never modifies or moves the source file. */
  private async importEmail(
    bytes: ArrayBuffer,
    sourcePath: string,
    displayName: string,
  ): Promise<ImportResult> {
    try {
      const extension = displayName.split(".").pop()?.toLowerCase() ?? "";
      const email: ParsedEmail =
        extension === "msg" ? await parseMsg(bytes) : await parseEml(bytes);

      const existing = findExistingByMessageId(this.app, email.messageId);
      if (existing) return { status: "duplicate", file: existing };

      const prefix = buildAttachmentPrefix(email);
      const inlineImages = this.settings.includeInlineImages
        ? email.inlineImages
        : [];
      const { written, inlinePaths } = await writeAttachments(
        this.app.vault,
        this.settings.attachmentsFolder,
        prefix,
        email.attachments,
        inlineImages,
      );

      const body = assembleBody(email, inlinePaths);
      const content = this.composeNote(email, sourcePath, body, written);

      const file = await this.createNote(email, content);
      return { status: "created", file };
    } catch (err) {
      return { status: "error", reason: describe(err) };
    }
  }

  private composeNote(
    email: ParsedEmail,
    sourcePath: string,
    body: string,
    written: { path: string; name: string }[],
  ): string {
    const frontmatter = buildFrontmatter(
      email,
      this.settings,
      sourcePath,
      written.map((w) => w.name),
    );

    const title = email.subject.replace(/[\r\n]+/g, " ").trim() || "no-subject";
    const sections = [frontmatter, `# ${title}`, "", metaBlock(email), "", body];

    if (written.length > 0) {
      sections.push("", "## Attachments");
      for (const attachment of written) sections.push(`- [[${attachment.path}]]`);
    }

    return `${sections.join("\n").trim()}\n`;
  }

  private async createNote(email: ParsedEmail, content: string): Promise<TFile> {
    const folder = normalizePath(this.settings.notesFolder);
    await ensureFolder(this.app.vault, folder);

    const base = renderFilename(this.settings.filenameTemplate, email, this.settings);
    let path = `${folder}/${base}.md`;
    let counter = 1;
    while (this.app.vault.getAbstractFileByPath(path)) {
      path = `${folder}/${base}-${counter++}.md`;
    }
    return this.app.vault.create(path, content);
  }

  private async openNote(file: TFile): Promise<void> {
    if (!this.settings.openNoteAfterManualImport) return;
    await this.app.workspace.getLeaf(true).openFile(file);
  }

  private notifyManual(name: string, result: ImportResult): void {
    if (result.status === "created") {
      new Notice(`Postbox: imported "${result.file.basename}"`);
    } else if (result.status === "duplicate") {
      new Notice(`Postbox: "${name}" already imported`);
    } else {
      new Notice(`Postbox: could not import "${name}" (${result.reason})`);
    }
  }

  private scheduleWatchNotice(): void {
    this.watchImported++;
    if (this.watchNoticeTimer) clearTimeout(this.watchNoticeTimer);
    this.watchNoticeTimer = setTimeout(() => {
      new Notice(`Postbox: imported ${this.watchImported} emails`);
      this.watchImported = 0;
      this.watchNoticeTimer = null;
    }, 2000);
  }
}

function metaBlock(email: ParsedEmail): string {
  const from = email.from
    ? email.from.name
      ? `${email.from.name} <${email.from.address}>`
      : email.from.address
    : "";
  const to = email.to.map((a) => a.address).join(", ");
  const date = email.date ? formatDate(email.date, "YYYY-MM-DD HH:mm") : "";
  return [`**From:** ${from}`, `**To:** ${to}`, `**Date:** ${date}`].join("\n");
}

function pickFiles(): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".eml,.msg";
    input.multiple = true;
    input.style.display = "none";
    document.body.appendChild(input);

    const finish = (files: File[]) => {
      input.remove();
      resolve(files);
    };
    input.addEventListener("change", () =>
      finish(input.files ? Array.from(input.files) : []),
    );
    input.addEventListener("cancel", () => finish([]));
    input.click();
  });
}

function filePath(file: File): string {
  const path = (file as unknown as { path?: string }).path;
  return path || file.name;
}

function basename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
