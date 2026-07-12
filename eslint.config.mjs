import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import js from "@eslint/js";

export default defineConfig({
	files: ["**/*.{js,ts}"],
	extends: [...js.configs.recommended, ...tseslint.configs.recommended, ...obsidianmd.configs.recommended],
	languageOptions: {
		globals: {
			...globals.browser,
		},
	},
});
