#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const composableAllowlist = new Map([
	[
		'app/composables/comments.ts',
		{
			expectedExport: 'useComments',
			allowedExport: 'useComment',
			reason: 'Legacy singular naming kept for compatibility with existing runtime usage.'
		}
	]
])
let activeRootDir = process.cwd()

/** @param {string} path */
const readText = (path) => readFileSync(path, 'utf8')

/** @param {string} name */
const kebabToPascal = (name) =>
	name
		.split('-')
		.filter(Boolean)
		.map((part) => part[0].toUpperCase() + part.slice(1))
		.join('')

/** @param {string} filePath */
const normalizePath = (filePath) => filePath.replaceAll('\\', '/')

/**
 * @param {string} startPath
 * @param {(filePath: string) => boolean} predicate
 */
const findFiles = (startPath, predicate) => {
	/** @type {string[]} */
	const results = []
	/** @type {string[]} */
	const stack = [startPath]
	while (stack.length > 0) {
		const current = stack.pop()
		if (!current || !existsSync(current)) {
			continue
		}
		const entry = statSync(current)
		if (entry.isDirectory()) {
			for (const child of readdirSync(current)) {
				if (child.startsWith('.')) {
					continue
				}
				stack.push(join(current, child))
			}
			continue
		}
		if (predicate(current)) {
			results.push(current)
		}
	}
	return results.sort((a, b) => a.localeCompare(b))
}

/**
 * @param {string} filePath
 * @param {string[]} errors
 */
const checkComposableContract = (filePath, errors) => {
	const source = readText(filePath)
	const exportMatches = [
		...source.matchAll(/export\s+(?:const|function)\s+(use[A-Za-z0-9_]*)\s*/g)
	]
	const exportedUseNames = exportMatches.map((match) => match[1])
	if (exportedUseNames.length === 0) {
		return
	}
	const basename = normalizePath(filePath).split('/').pop()?.replace(/\.ts$/, '')
	if (!basename) {
		return
	}
	const expectedUseName = `use${kebabToPascal(basename.replace(/^use-/, ''))}`
	const relativePath = normalizePath(relative(activeRootDir, filePath))
	const allowlisted = composableAllowlist.get(relativePath)

	if (exportedUseNames.length !== 1) {
		errors.push(
			`${relativePath}: expected exactly one exported use* composable, found ${exportedUseNames.length}`
		)
	}
	if (
		allowlisted &&
		exportedUseNames.length === 1 &&
		exportedUseNames[0] === allowlisted.allowedExport &&
		expectedUseName === allowlisted.expectedExport
	) {
		return
	}
	if (!exportedUseNames.includes(expectedUseName)) {
		errors.push(
			`${relativePath}: expected exported composable "${expectedUseName}" to match file name`
		)
	}
}

/**
 * @param {string} filePath
 * @param {string[]} errors
 */
const checkNuxtAutoImportConvention = (filePath, errors) => {
	const source = readText(filePath)
	const relativePath = normalizePath(relative(activeRootDir, filePath))
	const importStatementPattern =
		/import\s+type\s*\{([^}]*)\}\s*from\s*['"](?:vue|#imports|nuxt\/app)['"]|import\s*\{([^}]*)\}\s*from\s*['"](?:vue|#imports|nuxt\/app)['"]/g
	const disallowed = new Set([
		'ref',
		'computed',
		'watch',
		'Ref',
		'ComputedRef',
		'useAsyncData',
		'useState'
	])

	for (const match of source.matchAll(importStatementPattern)) {
		const specifierBlock = match[1] ?? match[2] ?? ''
		const importedNames = specifierBlock
			.split(',')
			.map((token) => token.trim())
			.filter(Boolean)
			.map((token) =>
				token
					.replace(/^type\s+/, '')
					.split(/\s+as\s+/i)[0]
					?.trim()
			)
			.filter(Boolean)

		for (const importedName of importedNames) {
			if (!disallowed.has(importedName)) {
				continue
			}
			errors.push(
				`${relativePath}: disallowed explicit import "${importedName}" in Nuxt runtime file (use auto-import instead)`
			)
		}
	}
}

/**
 * @param {string} markdownPath
 * @param {string[]} errors
 */
const checkDocLinks = (markdownPath, errors) => {
	const source = readText(markdownPath)
	const relativePath = normalizePath(relative(activeRootDir, markdownPath))
	const markdownLinkPattern = /\[[^\]]+\]\((?:<([^>]+)>|([^)]+))\)/g

	for (const match of source.matchAll(markdownLinkPattern)) {
		const rawTarget = (match[1] ?? match[2])?.trim()
		if (!rawTarget || rawTarget.startsWith('http://') || rawTarget.startsWith('https://')) {
			continue
		}
		if (rawTarget.startsWith('mailto:') || rawTarget.startsWith('#')) {
			continue
		}
		const cleanTarget = rawTarget.split(/[?#]/)[0]
		if (!cleanTarget) {
			continue
		}
		const resolvedPath = resolve(markdownPath, '..', cleanTarget)
		if (existsSync(resolvedPath)) {
			continue
		}
		errors.push(`${relativePath}: stale markdown link target "${cleanTarget}" does not exist`)
	}
}

/** @type {string[]} */
const runConventionChecks = (rootDir) => {
	activeRootDir = rootDir
	/** @type {string[]} */
	const errors = []

	const composableFiles = findFiles(join(rootDir, 'app', 'composables'), (filePath) =>
		filePath.endsWith('.ts')
	)
	for (const filePath of composableFiles) {
		checkComposableContract(filePath, errors)
	}

	const runtimeFiles = findFiles(join(rootDir, 'app'), (filePath) =>
		/\.(?:ts|js|vue)$/.test(filePath)
	)
	for (const filePath of runtimeFiles) {
		checkNuxtAutoImportConvention(filePath, errors)
	}

	const documentationFiles = findFiles(join(rootDir, 'docs'), (filePath) =>
		filePath.endsWith('.md')
	)
	for (const filePath of documentationFiles) {
		checkDocLinks(filePath, errors)
	}

	return errors
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	const rootDir = process.cwd()
	const errors = runConventionChecks(rootDir)
	if (errors.length > 0) {
		console.error('Convention checks failed:')
		for (const error of errors) {
			console.error(`- ${error}`)
		}
		process.exit(1)
	}

	console.log('Convention checks passed')
}

export { runConventionChecks }
