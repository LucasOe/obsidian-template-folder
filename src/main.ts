import { Notice, Plugin, PluginSettingTab, Setting } from "obsidian";
import type { App, FrontMatterCache, TFile } from "obsidian";
import { around } from "monkey-around";
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
	monkey_patches: (() => void)[] = [];

	async onload() {
		await this.loadSettings();
		const settings = this.settings;
		this.addSettingTab(new SettingTab(this.app, this));

		if (!this.app.internalPlugins.getPluginById("templates")?.enabled) return;

		this.monkey_patches.push(
			around(Object.getPrototypeOf(this.app.internalPlugins.getEnabledPluginById("templates")), {
				insertTemplate: (originalMethod) => {
					return async function (template: TFile) {
						const app: App = this.app;

						const activeFile = app.workspace.getActiveFile();
						if (!activeFile) return;

						// Apply the Template
						//
						// We're using our own implementation, because using the
						// original method doesn't work reliably for some reason:
						// originalMethod.apply(this, [template]);
						const content = await app.vault.cachedRead(template);
						const formattedContent = formatContent(this, content);
						await app.vault.modify(activeFile, formattedContent);

						// Get Template property
						const metadata = app.metadataCache.getFileCache(template);
						if (!metadata || !metadata.frontmatter) return;
						const folderProperty = metadata.frontmatter[settings.propertyName];

						// Check property type
						if (typeof folderProperty != "string") {
							console.error("Template Folder Property has to be of type 'text'!");
							new Notice("Template Folder Property has to be of type 'text'!");
							return;
						}

						// Move active file
						try {
							await app.fileManager.renameFile(activeFile, path.join(folderProperty, activeFile.name));
						} catch (error) {
							console.error(error);
							new Notice(error);
							return;
						}

						// Remove frontmatter
						if (!settings.removeProperty) return;
						if (!activeFile) return;
						await app.fileManager.processFrontMatter(activeFile, (frontmatter: FrontMatterCache) => {
							delete frontmatter[settings.propertyName];
						});
					};
				},
			})
		);
	}

	async onunload() {
		for (const uninstall_monkey of this.monkey_patches) uninstall_monkey();
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
			.setName("Template folder property")
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
			.setName("Remove property")
			.setDesc("Remove the template folder property when applying the template to a note.")
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatContent(context: any, content: string) {
	// Replace {{title}}
	const activeFile = this.app.workspace.getActiveFile();
	content = content.replace(/\{\{title\}\}/g, activeFile.basename ?? "");

	// Replace {{date}}
	const DATE_PLACEHOLDER_REGEX = /\{\{date(?::(.*?))?\}\}/g;
	const DEFAULT_DATE_FORMAT = "YYYY-MM-DD";
	content = content.replace(DATE_PLACEHOLDER_REGEX, (_, fmt) => {
		const format = fmt?.trim() || context.options.dateFormat || DEFAULT_DATE_FORMAT;
		return window.moment().format(format);
	});

	// Replace {{time}}
	const TIME_PLACEHOLDER_REGEX = /\{\{time(?::(.*?))?\}\}/g;
	const DEFAULT_TIME_FORMAT = "HH:mm";
	content = content.replace(TIME_PLACEHOLDER_REGEX, (_, fmt) => {
		const format = fmt?.trim() || context.options.timeFormat || DEFAULT_TIME_FORMAT;
		return window.moment().format(format);
	});

	return content;
}
