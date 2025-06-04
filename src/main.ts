import {
	App,
	CachedMetadata,
	FileManager,
	FrontMatterCache,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
} from "obsidian";
import { around } from "monkey-around";
import { stat } from "fs/promises";
import * as path from "path";

interface PluginSettings {
	propertyName: string;
	removeProperty: boolean;
}

const DEFAULT_SETTINGS: PluginSettings = {
	propertyName: "folder",
	removeProperty: true,
};

export default class TemplateFolderPlugin extends Plugin {
	settings: PluginSettings;

	async onload() {
		await this.loadSettings();
		const settings = this.settings;
		this.addSettingTab(new SettingTab(this.app, this));

		if (!this.app.internalPlugins.getPluginById("templates")?.enabled) return;
		console.log("Template Folder Plugin loaded.");

		this.register(
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			around(Object.getPrototypeOf(this.app.internalPlugins.getEnabledPluginById("templates")!), {
				insertTemplate: (originalMethod) => {
					return async function (template: TFile) {
						// Default fallback function to call the original method
						const applyOriginal = () => originalMethod && originalMethod.apply(this, [template]);

						const metadata: CachedMetadata | undefined = this.app.metadataCache.getFileCache(template);
						if (!metadata) return applyOriginal();

						const frontmatter: FrontMatterCache | undefined = metadata.frontmatter;
						if (!frontmatter) return applyOriginal();
						const folderProperty = frontmatter[settings.propertyName];

						// Check property type
						if (typeof folderProperty != "string") {
							console.error("Template Folder Property has to be of type 'text'!");
							new Notice("Template Folder Property has to be of type 'text'!");
							return applyOriginal();
						}

						// Check if property is a valid path
						const absolutePath = path.join(this.app.vault.adapter.basePath, folderProperty);
						if (!(await isValidDirectory(absolutePath))) {
							console.error("Template Folder Property has to be an existing folder!");
							new Notice("Template Folder Property has to be an existing folder!");
							return applyOriginal();
						}

						const activeFile: TFile = this.app.workspace.getActiveFile();
						const fileManager: FileManager = this.app.fileManager;
						await fileManager.renameFile(activeFile, path.join(folderProperty, activeFile.name));

						return applyOriginal();
					};
				},
			})
		);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SettingTab extends PluginSettingTab {
	plugin: TemplateFolderPlugin;

	constructor(app: App, plugin: TemplateFolderPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Template Folder Property")
			.setDesc("Name of the frontmatter property in templates that defines where notes should be moved.")
			.addText((text) =>
				text //
					.setPlaceholder(DEFAULT_SETTINGS.propertyName)
					.setValue(this.plugin.settings.propertyName)
					.onChange((value) => {
						this.plugin.settings.propertyName = value;
						this.plugin.saveSettings();
						this.display();
					})
			);

		new Setting(containerEl)
			.setName("Remove Property")
			.setDesc("Remove the Template Folder Property when applying the template to a note.")
			.addToggle((toggle) =>
				toggle //
					.setValue(this.plugin.settings.removeProperty)
					.onChange((value) => {
						this.plugin.settings.removeProperty = value;
						this.plugin.saveSettings();
						this.display();
					})
			);
	}
}

async function isValidDirectory(path: string) {
	try {
		const stats = await stat(path);
		return stats.isDirectory();
	} catch {
		return false;
	}
}
