import { fileURLToPath } from 'node:url'

import { defineVitestProject } from '@nuxt/test-utils/config'
import { defineConfig } from 'vitest/config'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const aliases = {
	'@ai': fileURLToPath(new URL('./config/ai.ts', import.meta.url)),
	'@constants': fileURLToPath(new URL('./config/constants.ts', import.meta.url)),
	'@schema': fileURLToPath(new URL('./schema', import.meta.url)),
	'@server': fileURLToPath(new URL('./server', import.meta.url)),
	'~': fileURLToPath(new URL('./app', import.meta.url)),
	'~~': rootDir
}

const nuxtProject = await defineVitestProject({
	test: {
		name: 'nuxt',
		include: ['tests/nuxt/**/*.test.ts'],
		setupFiles: ['./tests/setup/nuxt.ts'],
		environmentOptions: {
			nuxt: {
				rootDir,
				domEnvironment: 'happy-dom',
				dotenv: {
					cwd: rootDir,
					fileName: '.env.test'
				},
				mock: {
					intersectionObserver: true,
					indexedDb: false
				}
			}
		}
	}
})

export default defineConfig({
	resolve: {
		alias: aliases
	},
	test: {
		alias: aliases,
		passWithNoTests: false,
		clearMocks: true,
		restoreMocks: true,
		unstubEnvs: true,
		unstubGlobals: true,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html', 'json-summary'],
			reportsDirectory: './coverage',
			include: ['app/**/*.ts', 'config/**/*.ts', 'schema/**/*.ts', 'server/**/*.ts'],
			exclude: ['**/*.d.ts', '**/*.vue', '**/README.md', 'tests/**'],
			thresholds: {
				lines: 85,
				functions: 80,
				branches: 75,
				statements: 85
			}
		},
		projects: [
			{
				resolve: {
					alias: aliases
				},
				test: {
					name: 'unit',
					environment: 'node',
					include: ['tests/unit/**/*.test.ts']
				}
			},
			nuxtProject
		]
	}
})
