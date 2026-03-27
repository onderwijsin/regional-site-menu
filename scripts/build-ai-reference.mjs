import { constants } from 'node:fs'
import { access, copyFile, mkdir, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(scriptDir, '..')
const outputPublicDir = resolve(rootDir, '.output/public')

const SNAPSHOTS = [
	{
		source: 'llms-full.txt',
		target: 'ai-reference/llms-full.static.txt',
	},
	{
		source: 'llms.txt',
		target: 'ai-reference/llms.static.txt',
	},
]

async function assertReadableNonEmpty(filePath) {
	await access(filePath, constants.R_OK)
	const fileStat = await stat(filePath)
	if (fileStat.size <= 0) {
		throw new Error(`Bestand is leeg: ${filePath}`)
	}
}

async function main() {
	for (const snapshot of SNAPSHOTS) {
		const sourcePath = resolve(outputPublicDir, snapshot.source)
		const targetPath = resolve(outputPublicDir, snapshot.target)

		await assertReadableNonEmpty(sourcePath)
		await mkdir(dirname(targetPath), { recursive: true })
		await copyFile(sourcePath, targetPath)

		console.log(`[ai-reference] snapshot geschreven: ${snapshot.target}`)
	}
}

main().catch((error) => {
	console.error('[ai-reference] build snapshot mislukt')
	console.error(error instanceof Error ? error.message : error)
	process.exit(1)
})
