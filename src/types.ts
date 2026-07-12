export {}; // This line is required. If there are no top-level `import/export` statements, your typings will work not as expected.

declare module "@obsidian-typings/obsidian-public-latest" {
	interface TemplatesPluginInstance {
		options: any;
	}
}
