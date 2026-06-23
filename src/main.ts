import { Menu, Notice, Plugin, TAbstractFile, TFile } from "obsidian";
import {
  DEFAULT_SETTINGS,
  MaildropSettings,
  MaildropSettingTab,
} from "./settings";
import { parseEml } from "./parser/eml";
import { parseMsg } from "./parser/msg";
import type { ParsedEmail } from "./types";
import { FolderWatcher } from "./watcher";

const SUPPORTED_EXTENSIONS = ["eml", "msg"];

export default class MaildropPlugin extends Plugin {
  settings: MaildropSettings = DEFAULT_SETTINGS;
  private watcher: FolderWatcher | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addSettingTab(new MaildropSettingTab(this.app, this));

    this.addCommand({
      id: "import-email-file",
      name: "Import email file (.eml/.msg)",
      callback: () => {
        // Placeholder until the system file picker + import pipeline land.
        new Notice("Maildrop: import pipeline not implemented yet.");
      },
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
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  startWatcherIfEnabled(): void {
    this.stopWatcher();
    if (this.settings.watchFolderEnabled && this.settings.watchFolderPath) {
      this.watcher = new FolderWatcher(this.settings.watchFolderPath, async () => {
        // Wired to the import pipeline once implemented.
      });
      void this.watcher.start().catch((err) => console.error("Maildrop watcher:", err));
    }
  }

  private stopWatcher(): void {
    this.watcher?.stop();
    this.watcher = null;
  }

  /** Read a vault .eml/.msg file and run it through the import pipeline. */
  private async importVaultFile(file: TFile): Promise<void> {
    try {
      const data = await this.app.vault.readBinary(file);
      const parsed = await this.parse(file.extension, data);
      // Note creation pipeline (converter -> attachments -> note-builder) lands next.
      void parsed;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      new Notice(`Maildrop: could not import ${file.name} (${reason})`);
      console.error("Maildrop import error:", err);
    }
  }

  private parse(extension: string, data: ArrayBuffer): Promise<ParsedEmail> {
    return extension === "msg" ? parseMsg(data) : parseEml(data);
  }
}
