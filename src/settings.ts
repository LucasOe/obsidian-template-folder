import { App, PluginSettingTab, Setting } from "obsidian";
import TemplateFolderPlugin from "./main";

export interface PluginSettings {
	propertyName: string;
	removeProperty: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	propertyName: "folder",
	removeProperty: true,
};

export class SettingTab extends PluginSettingTab {
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
