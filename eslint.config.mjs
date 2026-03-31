// @ts-check
import eslint from '@eslint/js'
import json from '@eslint/json'
import markdown from '@eslint/markdown'
import eslintConfigPrettier from 'eslint-config-prettier'
import jsdoc from 'eslint-plugin-jsdoc'

import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
	{
		rules: {
			'vue/multi-word-component-names': 'off',
			'no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_'
				}
			],
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_'
				}
			]
		}
	},

	// JS/TS only
	{
		files: ['**/*.{js,ts,jsx,tsx}'],
		...eslint.configs.recommended
	},

	// Function docs in source code
	{
		files: [
			'app/**/*.{js,ts}',
			'server/**/*.{js,ts}',
			'schema/**/*.{js,ts}',
			'shared/**/*.{js,ts}'
		],
		plugins: {
			jsdoc
		},
		settings: {
			jsdoc: {
				mode: 'typescript'
			}
		},
		rules: {
			'jsdoc/check-tag-names': 'error',
			'jsdoc/require-description': 'warn',
			'jsdoc/require-jsdoc': [
				'warn',
				{
					require: {
						ClassDeclaration: false,
						FunctionDeclaration: false,
						FunctionExpression: false,
						ArrowFunctionExpression: false,
						MethodDefinition: false
					},
					contexts: [
						'ExportNamedDeclaration > FunctionDeclaration',
						'ExportDefaultDeclaration > FunctionDeclaration',
						'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > ArrowFunctionExpression',
						'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > FunctionExpression',
						'ExportDefaultDeclaration > ArrowFunctionExpression',
						'ExportDefaultDeclaration > FunctionExpression'
					]
				}
			],
			'jsdoc/require-param': ['warn', { checkDestructured: false }],
			'jsdoc/require-param-description': 'warn',
			'jsdoc/require-returns': 'warn',
			'jsdoc/require-returns-description': 'warn',
			'jsdoc/require-throws-description': 'warn'
		}
	},

	// JSON
	{
		files: ['**/*.json'],
		language: 'json/json',
		...json.configs.recommended,
		rules: {
			'no-irregular-whitespace': 'off'
		}
	},

	{
		files: ['**/*.jsonc'],
		language: 'json/jsonc',
		...json.configs.recommended,
		rules: {
			'no-irregular-whitespace': 'off'
		}
	},

	{
		files: ['**/*.json5'],
		language: 'json/json5',
		...json.configs.recommended
	},

	// Markdown
	...markdown.configs.recommended,

	{
		files: ['**/*.md'],
		rules: {
			'no-irregular-whitespace': 'off'
		}
	},
	// Markdown JS blocks
	{
		files: ['**/*.md/*.js', '**/*.md/*.ts'],
		...eslint.configs.recommended
	},

	eslintConfigPrettier
)
