import { App, Plugin, PluginSettingTab, Setting, TFile } from "obsidian";
import { around } from "monkey-around";

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
		this.addSettingTab(new SettingTab(this.app, this));

		if (!this.app.internalPlugins.getPluginById("templates")?.enabled) return;
		console.log("Template Folder Plugin loaded.");

		this.register(
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			around(Object.getPrototypeOf(this.app.internalPlugins.getEnabledPluginById("templates")!), {
				insertTemplate: (originalMethod) => {
					return function (template: TFile) {
						// Selected Template
						console.log("Selected Template: ", template);

						return originalMethod && originalMethod.apply(this, [template]);
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
