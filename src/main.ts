import { App, FrontMatterCache, Notice, Plugin, TFile, normalizePath } from "obsidian";
import { around } from "monkey-around";
import { DEFAULT_SETTINGS, PluginSettings, SettingTab } from "./settings";

export default class TemplateFolderPlugin extends Plugin {
	settings!: PluginSettings;
	monkey_patches: (() => void)[] = [];

	async onload() {
		await this.loadSettings();
		const settings = this.settings;
		this.addSettingTab(new SettingTab(this.app, this));

		if (!this.app.internalPlugins.getPluginById("templates")?.enabled) return;

		this.monkey_patches.push(
			around(Object.getPrototypeOf(this.app.internalPlugins.getEnabledPluginById("templates")), {
				insertTemplate: (_originalMethod) => {
					return async function (this: Plugin, template: TFile) {
						try {
							const activeFile = this.app.workspace.getActiveFile();
							if (!activeFile) return;

							// Apply the Template
							//
							// We're using our own implementation, because using the
							// original method doesn't work reliably for some reason:
							// originalMethod.apply(this, [template]);
							const content = await this.app.vault.cachedRead(template);
							const formattedContent = formatContent(this.app, content);
							await this.app.vault.modify(activeFile, formattedContent);

							// Get Template property
							const metadata = this.app.metadataCache.getFileCache(template);
							if (!metadata || !metadata.frontmatter) return;
							const folderProperty = metadata.frontmatter[settings.propertyName];

							// Check property type
							if (typeof folderProperty != "string") {
								console.error("Template Folder Property has to be of type 'text'!");
								new Notice("Template Folder Property has to be of type 'text'!");
								return;
							}

							// Create folder if it doesn't already exist
							const folderPropertyNormalized = normalizePath(folderProperty);
							if (!this.app.vault.getFolderByPath(folderPropertyNormalized)) {
								await this.app.vault.createFolder(folderPropertyNormalized);
							}

							// Move active file
							await this.app.fileManager.renameFile(
								activeFile,
								joinPaths([folderProperty, activeFile.name])
							);

							// Remove frontmatter
							if (!settings.removeProperty) return;
							if (!activeFile) return;
							await this.app.fileManager.processFrontMatter(
								activeFile,
								(frontmatter: FrontMatterCache) => {
									delete frontmatter[settings.propertyName];
								}
							);
						} catch (error) {
							new Notice(error as string);
						}
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

function joinPaths(parts: string[]) {
	const seperator = "/";
	return normalizePath(parts.join(seperator));
}

function formatContent(app: App, content: string) {
	const templatePlugin = app.internalPlugins.getEnabledPluginById("templates");

	// Replace {{title}}
	const activeFile = app.workspace.getActiveFile();
	content = content.replace(/\{\{title\}\}/g, activeFile?.basename ?? "");

	// Replace {{date}}
	const DATE_PLACEHOLDER_REGEX = /\{\{date(?::(.*?))?\}\}/g;
	const DEFAULT_DATE_FORMAT = "YYYY-MM-DD";
	content = content.replace(DATE_PLACEHOLDER_REGEX, (_, fmt) => {
		const format = fmt?.trim() || templatePlugin?.options.dateFormat || DEFAULT_DATE_FORMAT;
		return window.moment().format(format);
	});

	// Replace {{time}}
	const TIME_PLACEHOLDER_REGEX = /\{\{time(?::(.*?))?\}\}/g;
	const DEFAULT_TIME_FORMAT = "HH:mm";
	content = content.replace(TIME_PLACEHOLDER_REGEX, (_, fmt) => {
		const format = fmt?.trim() || templatePlugin?.options.timeFormat || DEFAULT_TIME_FORMAT;
		return window.moment().format(format);
	});

	return content;
}
