# Template Folder Plugin

This plugin replaces the "Insert Template" command from the Templates core plugin, to allow for moving files through defining a property.

> [!WARNING]
> With this plugin enabled, using the "Insert Template" command will always replace the entire note with the template, instead of appending/merging like in the core plugin.

## Usage

Add a frontmatter property to your template file with the folder path where you want notes to be moved:

```yaml
---
folder: path/to/destination/folder
---
```

Create a new note and using the "Insert Template" command.
The new note will be moved to the folder specified in the template's frontmatter.

## Settings

- **Template Folder Property**: The name of the frontmatter property in templates that defines where notes should be moved. Default: `folder`
- **Remove Property**: When enabled, removes the template folder property from the note after applying the template. Default: enabled

## Prerequisites

This plugin depends on the core Templates plugin to be enabled.
