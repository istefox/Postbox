/**
 * Watches an external filesystem folder for new .eml/.msg files and feeds them
 * to an import callback, with a debounced queue to avoid racing files that are
 * still being written.
 *
 * Uses Node `fs` (desktop only). Not implemented yet (scaffold stage).
 */
export class FolderWatcher {
  private readonly folderPath: string;
  private readonly onFile: (filePath: string) => Promise<void>;

  constructor(folderPath: string, onFile: (filePath: string) => Promise<void>) {
    this.folderPath = folderPath;
    this.onFile = onFile;
  }

  /** Run an initial scan of the folder, then start the live watch. */
  async start(): Promise<void> {
    throw new Error("FolderWatcher.start: not implemented");
  }

  /** Stop the live watch and clear any pending queue. */
  stop(): void {
    // No-op until the watcher is implemented.
  }
}
