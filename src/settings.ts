import { App, PluginSettingTab, Setting } from "obsidian";
import type MaildropPlugin from "./main";

export interface MaildropSettings {
  notesFolder: string;
  attachmentsFolder: string;
  filenameTemplate: string;
  dateFormat: string;
  extraTag: string;
  includeInlineImages: boolean;
  watchFolderEnabled: boolean;
  watchFolderPath: string;
  openNoteAfterManualImport: boolean;
}

export const DEFAULT_SETTINGS: MaildropSettings = {
  notesFolder: "Email/",
  attachmentsFolder: "Email/attachments/",
  filenameTemplate: "{{date}}_{{from}}_{{subject}}",
  dateFormat: "YYYY-MM-DD",
  extraTag: "",
  includeInlineImages: true,
  watchFolderEnabled: false,
  watchFolderPath: "",
  openNoteAfterManualImport: true,
};

export class MaildropSettingTab extends PluginSettingTab {
  private plugin: MaildropPlugin;

  constructor(app: App, plugin: MaildropPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Notes folder")
      .setDesc("Vault folder where imported notes are created.")
      .addText((text) =>
        text
          .setPlaceholder("Email/")
          .setValue(this.plugin.settings.notesFolder)
          .onChange(async (value) => {
            this.plugin.settings.notesFolder = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Attachments folder")
      .setDesc("Vault folder where attachments and inline images are saved.")
      .addText((text) =>
        text
          .setPlaceholder("Email/attachments/")
          .setValue(this.plugin.settings.attachmentsFolder)
          .onChange(async (value) => {
            this.plugin.settings.attachmentsFolder = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Filename template")
      .setDesc(
        "Template for note filenames. Variables: {{date}}, {{time}}, {{from}}, {{subject}}, {{messageId}}.",
      )
      .addText((text) =>
        text
          .setPlaceholder("{{date}}_{{from}}_{{subject}}")
          .setValue(this.plugin.settings.filenameTemplate)
          .onChange(async (value) => {
            this.plugin.settings.filenameTemplate = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Date format")
      .setDesc("Date format used by the {{date}} template variable.")
      .addText((text) =>
        text
          .setPlaceholder("YYYY-MM-DD")
          .setValue(this.plugin.settings.dateFormat)
          .onChange(async (value) => {
            this.plugin.settings.dateFormat = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Extra tag")
      .setDesc("Additional tag added to every note alongside the fixed 'email' tag. Leave empty to disable.")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.extraTag)
          .onChange(async (value) => {
            this.plugin.settings.extraTag = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Include inline images")
      .setDesc("Extract and render inline (CID) images inside the note body.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.includeInlineImages)
          .onChange(async (value) => {
            this.plugin.settings.includeInlineImages = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Open note after manual import")
      .setDesc("Open the generated note after a successful manual import.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.openNoteAfterManualImport)
          .onChange(async (value) => {
            this.plugin.settings.openNoteAfterManualImport = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl).setName("Watch folder").setHeading();

    new Setting(containerEl)
      .setName("Enable watch folder")
      .setDesc("Automatically import new .eml/.msg files dropped into an external folder.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.watchFolderEnabled)
          .onChange(async (value) => {
            this.plugin.settings.watchFolderEnabled = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Watch folder path")
      .setDesc("Absolute filesystem path to watch (e.g. where Outlook exports emails).")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.watchFolderPath)
          .onChange(async (value) => {
            this.plugin.settings.watchFolderPath = value;
            await this.plugin.saveSettings();
          }),
      );
  }
}
