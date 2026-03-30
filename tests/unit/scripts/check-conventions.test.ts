import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { runConventionChecks } from '~~/scripts/check-conventions.mjs'
import { describe, expect, it } from 'vitest'

/**
 * Create a temporary repository-like fixture with required top-level folders.
 */
const createFixtureRoot = () => {
	const rootDir = mkdtempSync(join(tmpdir(), 'convention-check-'))
	mkdirSync(join(rootDir, 'app', 'composables'), { recursive: true })
	mkdirSync(join(rootDir, 'app', 'components'), { recursive: true })
	mkdirSync(join(rootDir, 'docs'), { recursive: true })
	return rootDir
}

describe('check-conventions script', () => {
	it('accepts compliant composable runtime imports and docs links', () => {
		const rootDir = createFixtureRoot()

		writeFileSync(
			join(rootDir, 'app/composables/use-something.ts'),
			"export const useSomething = () => useState('k', () => 1)\n",
			'utf8'
		)
		writeFileSync(
			join(rootDir, 'docs/guide.md'),
			'[Rules](../app/composables/use-something.ts)\n',
			'utf8'
		)
		writeFileSync(join(rootDir, 'app/components/example.ts'), 'const value = ref(1)\n', 'utf8')

		expect(runConventionChecks(rootDir)).toEqual([])
	})

	it('reports composable contract violations and stale docs links', () => {
		const rootDir = createFixtureRoot()

		writeFileSync(
			join(rootDir, 'app/composables/use-mismatch.ts'),
			'export const useWrong = () => 1\nexport const useAlsoWrong = () => 2\n',
			'utf8'
		)
		writeFileSync(join(rootDir, 'docs/guide.md'), '[Broken](../app/missing.ts)\n', 'utf8')

		expect(runConventionChecks(rootDir)).toEqual(
			expect.arrayContaining([
				expect.stringContaining(
					'app/composables/use-mismatch.ts: expected exactly one exported use* composable'
				),
				expect.stringContaining(
					'app/composables/use-mismatch.ts: expected exported composable "useMismatch"'
				),
				expect.stringContaining(
					'docs/guide.md: stale markdown link target "../app/missing.ts" does not exist'
				)
			])
		)
	})

	it('reports disallowed explicit runtime imports for auto-imported APIs', () => {
		const rootDir = createFixtureRoot()

		writeFileSync(
			join(rootDir, 'app/composables/use-ok.ts'),
			'export const useOk = () => 1\n',
			'utf8'
		)
		writeFileSync(
			join(rootDir, 'app/components/bad-import.ts'),
			"import { ref, computed } from 'vue'\nconst x = ref(1)\nconst y = computed(() => x.value)\n",
			'utf8'
		)

		expect(runConventionChecks(rootDir)).toEqual(
			expect.arrayContaining([
				expect.stringContaining(
					'app/components/bad-import.ts: disallowed explicit import "ref" in Nuxt runtime file'
				),
				expect.stringContaining(
					'app/components/bad-import.ts: disallowed explicit import "computed" in Nuxt runtime file'
				)
			])
		)
	})
})
