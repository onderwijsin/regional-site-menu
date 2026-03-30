import { describe, expect, it } from 'vitest'

import {
	evaluateChangedCoverage,
	getCoveredChangedFiles
} from '../../../../scripts/ci/changed-coverage-gate.mjs'

describe('scripts/ci/changed-coverage-gate', () => {
	it('filters changed files to covered TypeScript source paths', () => {
		expect(
			getCoveredChangedFiles([
				'app/composables/example.ts',
				'app/components/Button.vue',
				'server/api/example.ts',
				'shared/types/env.d.ts',
				'docs/ci-cd/README.md'
			])
		).toEqual(['app/composables/example.ts', 'server/api/example.ts'])
	})

	it('reports failures when changed file coverage is missing or below threshold', () => {
		const result = evaluateChangedCoverage({
			coverageSummary: {
				'/repo/app/composables/example.ts': { lines: { pct: 79.5 } },
				'/repo/server/api/example.ts': { lines: { pct: 100 } }
			},
			changedFiles: [
				'app/composables/example.ts',
				'server/api/example.ts',
				'schema/reportConfig.ts'
			],
			threshold: 80,
			rootDir: '/repo'
		})

		expect(result.checkedFiles).toEqual([
			'app/composables/example.ts',
			'server/api/example.ts',
			'schema/reportConfig.ts'
		])
		expect(result.failures).toEqual([
			{
				file: 'app/composables/example.ts',
				pct: 79.5,
				reason: 'Line coverage 79.50% is below threshold 80%'
			},
			{
				file: 'schema/reportConfig.ts',
				pct: null,
				reason: 'No coverage data found for changed file'
			}
		])
	})
})
