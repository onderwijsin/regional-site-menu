import fs from 'node:fs'
import path from 'node:path'

const COVERED_SOURCE_PATTERN = /^(app|config|schema|server|shared)\/.*\.ts$/

/**
 * Selects changed files that are in coverage scope.
 *
 * @param {string[]} changedFiles
 * @returns {string[]}
 */
export function getCoveredChangedFiles(changedFiles) {
	return changedFiles
		.map((file) => file.trim())
		.filter(Boolean)
		.map((file) => file.replace(/\\/g, '/'))
		.filter((file) => COVERED_SOURCE_PATTERN.test(file) && !file.endsWith('.d.ts'))
}

/**
 * Evaluates changed-file line coverage against a minimum threshold.
 *
 * @param {{
 *   coverageSummary: Record<string, { lines?: { pct?: number } }>;
 *   changedFiles: string[];
 *   threshold: number;
 *   rootDir: string;
 * }} params
 * @returns {{ checkedFiles: string[]; failures: Array<{ file: string; pct: number | null; reason: string }> }}
 */
export function evaluateChangedCoverage({ coverageSummary, changedFiles, threshold, rootDir }) {
	const checkedFiles = getCoveredChangedFiles(changedFiles)
	const failures = []

	for (const file of checkedFiles) {
		const absolutePath = path.resolve(rootDir, file)
		const entry = coverageSummary[absolutePath]

		if (!entry || typeof entry.lines?.pct !== 'number') {
			failures.push({
				file,
				pct: null,
				reason: 'No coverage data found for changed file'
			})
			continue
		}

		if (entry.lines.pct < threshold) {
			failures.push({
				file,
				pct: entry.lines.pct,
				reason: `Line coverage ${entry.lines.pct.toFixed(2)}% is below threshold ${threshold}%`
			})
		}
	}

	return { checkedFiles, failures }
}

function parseArg(name, fallback = '') {
	const index = process.argv.indexOf(name)
	if (index === -1) {
		return fallback
	}
	return process.argv[index + 1] || fallback
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const coveragePath = parseArg('--coverage')
	const changedPath = parseArg('--changed')
	const threshold = Number.parseFloat(parseArg('--threshold', '80'))

	if (!coveragePath || !changedPath || !Number.isFinite(threshold)) {
		console.error(
			'Usage: node scripts/ci/changed-coverage-gate.mjs --coverage <coverage-summary.json> --changed <changed-files.txt> --threshold <number>'
		)
		process.exit(1)
	}

	const coverageSummary = JSON.parse(fs.readFileSync(coveragePath, 'utf8'))
	const changedFiles = fs
		.readFileSync(changedPath, 'utf8')
		.split('\n')
		.map((file) => file.trim())
		.filter(Boolean)

	const { checkedFiles, failures } = evaluateChangedCoverage({
		coverageSummary,
		changedFiles,
		threshold,
		rootDir: process.cwd()
	})

	if (checkedFiles.length === 0) {
		console.log(
			'No changed app/config/schema/server/shared TypeScript files in coverage scope. Skipping gate.'
		)
		process.exit(0)
	}

	if (failures.length > 0) {
		console.error(`Changed-file coverage gate failed (${failures.length} file(s)).`)
		for (const failure of failures) {
			const pct = failure.pct === null ? 'n/a' : `${failure.pct.toFixed(2)}%`
			console.error(`- ${failure.file}: ${pct} (${failure.reason})`)
		}
		process.exit(1)
	}

	console.log(
		`Changed-file coverage gate passed for ${checkedFiles.length} file(s) with minimum line coverage ${threshold}%.`
	)
}
