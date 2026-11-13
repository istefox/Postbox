import { App, Menu, PluginSettingTab, Setting, setIcon } from "obsidian";
import {
  MESSAGE_ID_ROW,
  PROPERTY_TYPES,
  PROPERTY_VARIABLES,
  PropertyRow,
  PropertyType,
  defaultProperties,
  newPropertyRow,
} from "./properties";
import type PostboxPlugin from "./main";

export interface PostboxSettings {
  properties: PropertyRow[];
  notesFolder: string;
  attachmentsFolder: string;
  filenameTemplate: string;
  dateFormat: string;
  extraTag: string;
  sourceAccount: string;
  includeInlineImages: boolean;
  watchFolderEnabled: boolean;
  watchFolderPath: string;
  openNoteAfterManualImport: boolean;
}

export const DEFAULT_SETTINGS: PostboxSettings = {
  properties: defaultProperties(),
  notesFolder: "Email/",
  attachmentsFolder: "Email/attachments/",
  filenameTemplate: "{{date}}_{{from}}_{{subject}}",
  dateFormat: "YYYY-MM-DD",
  extraTag: "",
  sourceAccount: "",
  includeInlineImages: true,
  watchFolderEnabled: false,
  watchFolderPath: "",
  openNoteAfterManualImport: true,
};

export class PostboxSettingTab extends PluginSettingTab {
  private plugin: PostboxPlugin;

  constructor(app: App, plugin: PostboxPlugin) {
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
      .setName("Source account")
      .setDesc("Mailbox this email was received on, written to the source-account frontmatter field. Leave empty to disable.")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.sourceAccount)
          .onChange(async (value) => {
            this.plugin.settings.sourceAccount = value;
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

    new Setting(containerEl).setName("Frontmatter properties").setHeading();

    const variables = PROPERTY_VARIABLES.map((v) => `{{${v.name}}}`).join(", ");
    new Setting(containerEl).setDesc(
      "Properties written to the top of each imported note. Use variables to fill in data from the email: " +
        `${variables}. Changes apply to newly imported notes only. ` +
        "The Message-ID property can be renamed but not removed, because it is used to skip duplicates.",
    );

    const listEl = containerEl.createDiv({ cls: "postbox-prop-list" });
    this.renderProperties(listEl);

    new Setting(containerEl)
      .addButton((button) =>
        button.setButtonText("Add property").onClick(async () => {
          this.plugin.settings.properties.push(newPropertyRow());
          await this.saveProperties();
          this.renderProperties(listEl);
        }),
      )
      .addButton((button) =>
        button.setButtonText("Reset to defaults").onClick(async () => {
          this.plugin.settings.properties = defaultProperties();
          await this.saveProperties();
          this.renderProperties(listEl);
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

  /** Persist property edits without restarting the watch folder. */
  private async saveProperties(): Promise<void> {
    await this.plugin.saveData(this.plugin.settings);
  }

  private renderProperties(listEl: HTMLElement): void {
    listEl.empty();
    const rows = this.plugin.settings.properties;
    let dragIndex = -1;

    rows.forEach((row, index) => {
      const rowEl = listEl.createDiv({ cls: "postbox-prop-row" });
      const required = row.id === MESSAGE_ID_ROW;

      const handle = rowEl.createSpan({ cls: "postbox-prop-handle" });
      setIcon(handle, "grip-vertical");
      handle.addEventListener("mousedown", () => (rowEl.draggable = true));
      rowEl.addEventListener("dragstart", (evt) => {
        dragIndex = index;
        evt.dataTransfer?.setData("text/plain", row.key);
        rowEl.addClass("is-dragging");
      });
      rowEl.addEventListener("dragend", () => {
        rowEl.draggable = false;
        rowEl.removeClass("is-dragging");
      });
      rowEl.addEventListener("dragover", (evt) => {
        if (dragIndex < 0) return;
        evt.preventDefault();
        rowEl.addClass("is-drop-target");
      });
      rowEl.addEventListener("dragleave", () => rowEl.removeClass("is-drop-target"));
      rowEl.addEventListener("drop", (evt) => {
        evt.preventDefault();
        const from = dragIndex;
        dragIndex = -1;
        if (from < 0 || from === index) return rowEl.removeClass("is-drop-target");
        const [moved] = rows.splice(from, 1);
        rows.splice(index, 0, moved);
        void this.saveProperties().then(() => this.renderProperties(listEl));
      });

      const typeBtn = rowEl.createEl("button", {
        cls: "postbox-prop-type clickable-icon",
        attr: { "aria-label": `Property type: ${row.type}` },
      });
      setIcon(typeBtn, typeIcon(row.type));
      if (required) {
        typeBtn.disabled = true;
      } else {
        typeBtn.addEventListener("click", (evt) => {
          const menu = new Menu();
          for (const type of PROPERTY_TYPES) {
            menu.addItem((item) =>
              item
                .setTitle(typeLabel(type))
                .setIcon(typeIcon(type))
                .setChecked(row.type === type)
                .onClick(async () => {
                  row.type = type;
                  await this.saveProperties();
                  this.renderProperties(listEl);
                }),
            );
          }
          menu.showAtMouseEvent(evt);
        });
      }

      const keyInput = rowEl.createEl("input", {
        cls: "postbox-prop-key",
        attr: { type: "text", placeholder: "Property name", spellcheck: "false" },
      });
      keyInput.value = row.key;
      keyInput.addEventListener("input", () => {
        row.key = keyInput.value;
        void this.saveProperties();
      });

      const valueInput = rowEl.createEl("input", {
        cls: "postbox-prop-value",
        attr: { type: "text", placeholder: "Value, e.g. {{subject}}", spellcheck: "false" },
      });
      valueInput.value = row.value;
      if (required) {
        valueInput.disabled = true;
      } else {
        valueInput.addEventListener("input", () => {
          row.value = valueInput.value;
          void this.saveProperties();
        });
      }

      const deleteBtn = rowEl.createEl("button", {
        cls: "postbox-prop-delete clickable-icon",
        attr: { "aria-label": required ? "Message-ID cannot be removed" : "Remove property" },
      });
      setIcon(deleteBtn, "trash-2");
      if (required) {
        deleteBtn.disabled = true;
      } else {
        deleteBtn.addEventListener("click", async () => {
          rows.splice(index, 1);
          await this.saveProperties();
          this.renderProperties(listEl);
        });
      }
    });
  }
}

function typeIcon(type: PropertyType): string {
  return type === "list" ? "list" : type === "date" ? "calendar" : "align-left";
}

function typeLabel(type: PropertyType): string {
  return type === "list" ? "List" : type === "date" ? "Date" : "Text";
}
