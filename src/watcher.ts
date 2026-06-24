import { FSWatcher, watch } from "fs";
import { readdir } from "fs/promises";
import { extname, join } from "path";

/**
 * Watches an external filesystem folder for new .eml/.msg files and feeds them
 * to an import callback, with a debounced queue so a file that is still being
 * written is not imported mid-write. Desktop only (uses Node fs).
 */
export class FolderWatcher {
  private watcher: FSWatcher | null = null;
  private readonly timers = new Map<string, number>();
  private readonly settleMs = 1500;

  constructor(
    private readonly folderPath: string,
    private readonly onFile: (filePath: string) => Promise<void>,
  ) {}

  /** Scan the folder once, then watch for new files. */
  async start(): Promise<void> {
    const entries = await readdir(this.folderPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && this.isSupported(entry.name)) {
        await this.process(join(this.folderPath, entry.name));
      }
    }

    this.watcher = watch(this.folderPath, (_event, filename) => {
      if (!filename) return;
      const name = filename.toString();
      if (this.isSupported(name)) this.schedule(join(this.folderPath, name));
    });
  }

  /** Stop watching and drop any pending queue. */
  stop(): void {
    this.watcher?.close();
    this.watcher = null;
    for (const timer of this.timers.values()) window.clearTimeout(timer);
    this.timers.clear();
  }

  private schedule(filePath: string): void {
    const existing = this.timers.get(filePath);
    if (existing) window.clearTimeout(existing);
    this.timers.set(
      filePath,
      window.setTimeout(() => {
        this.timers.delete(filePath);
        void this.process(filePath);
      }, this.settleMs),
    );
  }

  private async process(filePath: string): Promise<void> {
    try {
      await this.onFile(filePath);
    } catch (err) {
      console.error("Postbox watcher:", err);
    }
  }

  private isSupported(name: string): boolean {
    const ext = extname(name).toLowerCase();
    return ext === ".eml" || ext === ".msg";
  }
}
