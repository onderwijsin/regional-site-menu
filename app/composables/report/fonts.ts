import type { jsPDF } from 'jspdf'

/**
 * Loads a font file and converts it into base64 content for jsPDF VFS usage.
 *
 * @param url - Font URL.
 * @returns Base64-encoded font content.
 * @throws {Error} When the font cannot be fetched.
 */
async function loadFont(url: string): Promise<string> {
	const res = await fetch(url)

	if (!res.ok) {
		throw new Error(`Failed to load font: ${url}`)
	}

	const blob = await res.blob()

	return await new Promise<string>((resolve, reject) => {
		const reader = new FileReader()

		reader.onload = () => {
			const result = reader.result as string

			// strip "data:...;base64,"
			const base64 = result.split(',')[1]

			resolve(base64!)
		}

		reader.onerror = reject
		reader.readAsDataURL(blob)
	})
}

/**
 * Registers all Rijksoverheid body and heading fonts on a jsPDF instance.
 *
 * @param doc - jsPDF instance.
 * @returns Nothing.
 * @throws {Error} When one or more font assets cannot be loaded.
 *
 * @example
 * ```ts
 * const doc = new jsPDF()
 * await registerFonts(doc)
 * ```
 */
export async function registerFonts(doc: jsPDF): Promise<void> {
	const [bodyRegular, bodyBold, bodyItalic, headingRegular, headingBold, headingItalic] =
		await Promise.all([
			loadFont('/fonts/Rijksoverheid-regular.ttf'),
			loadFont('/fonts/Rijksoverheid-bold.ttf'),
			loadFont('/fonts/Rijksoverheid-italic.ttf'),
			loadFont('/fonts/Rijksoverheid-Heading-regular.ttf'),
			loadFont('/fonts/Rijksoverheid-Heading-bold.ttf'),
			loadFont('/fonts/Rijksoverheid-Heading-italic.ttf')
		])

	// Register body fonts first because most helpers assume this family exists.
	doc.addFileToVFS('Rijksoverheid-Regular.ttf', bodyRegular)
	doc.addFont('Rijksoverheid-Regular.ttf', 'Rijksoverheid', 'normal')

	doc.addFileToVFS('Rijksoverheid-Bold.ttf', bodyBold)
	doc.addFont('Rijksoverheid-Bold.ttf', 'Rijksoverheid', 'bold')

	doc.addFileToVFS('Rijksoverheid-Italic.ttf', bodyItalic)
	doc.addFont('Rijksoverheid-Italic.ttf', 'Rijksoverheid', 'italic')

	// Heading fonts are kept as a separate family so sections can opt into a
	// clearer visual hierarchy without reconfiguring shared text helpers.
	doc.addFileToVFS('Rijksoverheid-Heading-Regular.ttf', headingRegular)
	doc.addFont('Rijksoverheid-Heading-Regular.ttf', 'RijksoverheidHeading', 'normal')

	doc.addFileToVFS('Rijksoverheid-Heading-Bold.ttf', headingBold)
	doc.addFont('Rijksoverheid-Heading-Bold.ttf', 'RijksoverheidHeading', 'bold')

	doc.addFileToVFS('Rijksoverheid-Heading-Italic.ttf', headingItalic)
	doc.addFont('Rijksoverheid-Heading-Italic.ttf', 'RijksoverheidHeading', 'italic')
}
