import { TFolder, Vault } from "obsidian";

/** Create a vault folder and any missing parents. No-op if it already exists. */
export async function ensureFolder(vault: Vault, folder: string): Promise<void> {
  const parts = folder.split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    const existing = vault.getAbstractFileByPath(current);
    if (existing instanceof TFolder) continue;
    if (!existing) await vault.createFolder(current);
  }
}
