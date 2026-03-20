// @ts-check
import eslint from '@eslint/js'
import json from '@eslint/json'
import markdown from '@eslint/markdown'
import eslintConfigPrettier from 'eslint-config-prettier'

import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
	{
		rules: {
			'vue/multi-word-component-names': 'off',
		},
	},

	// JS/TS only
	{
		files: ['**/*.{js,ts,jsx,tsx}'],
		...eslint.configs.recommended,
	},

	// JSON
	{
		files: ['**/*.json'],
		language: 'json/json',
		...json.configs.recommended,
		rules: {
			'no-irregular-whitespace': 'off',
		},
	},

	{
		files: ['**/*.jsonc'],
		language: 'json/jsonc',
		...json.configs.recommended,
	},

	{
		files: ['**/*.json5'],
		language: 'json/json5',
		...json.configs.recommended,
	},

	// Markdown
	...markdown.configs.recommended,

	{
		files: ['**/*.md'],
		rules: {
			'no-irregular-whitespace': 'off',
		},
	},
	// Markdown JS blocks
	{
		files: ['**/*.md/*.js', '**/*.md/*.ts'],
		...eslint.configs.recommended,
	},

	eslintConfigPrettier,
)
