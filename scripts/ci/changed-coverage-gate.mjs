import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const COVERAGE_GATE_DIRECTORIES = ['app', 'config', 'schema', 'server', 'shared']
const DEFAULT_THRESHOLD = '80'
const COVERED_SOURCE_PATTERN = new RegExp(`^(${COVERAGE_GATE_DIRECTORIES.join('|')})/.*\\.ts$`)

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

export function parseArg(args, name, fallback = '') {
	const index = args.indexOf(name)
	if (index === -1) {
		return fallback
	}
	const value = args[index + 1]
	if (value === undefined || value.startsWith('--')) {
		return fallback
	}
	return value
}

const IS_MAIN_MODULE = (() => {
	if (typeof process.argv[1] !== 'string') {
		return false
	}

	try {
		const mainPath = fs.realpathSync(path.resolve(process.argv[1]))
		const modulePath = fs.realpathSync(fileURLToPath(import.meta.url))
		return mainPath === modulePath
	} catch {
		return false
	}
})()

if (IS_MAIN_MODULE) {
	const coveragePath = parseArg(process.argv, '--coverage')
	const changedPath = parseArg(process.argv, '--changed')
	const threshold = Number.parseFloat(parseArg(process.argv, '--threshold', DEFAULT_THRESHOLD))

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
