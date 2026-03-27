/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions & import('@ianvs/prettier-plugin-sort-imports').PluginOptions} */
export default {
	plugins: [
		'@ianvs/prettier-plugin-sort-imports',
		'prettier-plugin-tailwindcss',
		'prettier-plugin-mdc'
	],
	semi: false,
	singleQuote: true,
	trailingComma: 'none',
	proseWrap: 'always',
	printWidth: 100,
	tabWidth: 4,
	useTabs: true,
	overrides: [
		{
			files: ['*.yaml', '*.yml'],
			options: {
				tabWidth: 2,
				// Setting useTabs just in case. Prettier _should_ ignore it and
				// default to spaces for YAML. Also, somehow prettier does not
				// respect the `indent_size` in .editorconfig for YAML files.
				useTabs: false
			}
		},
		{
			files: ['*.md'],
			options: {
				tabWidth: 2,
				useTabs: false,
				parser: 'mdc'
			}
		}
	],
	importOrder: [
		'<TYPES>^(node:)',
		'<TYPES>',
		'<TYPES>^@/',
		'<TYPES>^[.]',
		'',
		'<BUILTIN_MODULES>',
		'',
		'<THIRD_PARTY_MODULES>',
		'',
		'^@/(.*)$',
		'',
		'^[./]'
	],
	importOrderCaseSensitive: false
}
