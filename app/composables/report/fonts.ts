import type { jsPDF } from 'jspdf'

/**
 * Loads a font file and returns base64 content.
 *
 * @param url - Font URL.
 * @returns Base64 string.
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
 * Registers all Rijksoverheid fonts.
 *
 * @param doc - jsPDF instance.
 * @returns Nothing.
 */
export async function registerFonts(doc: jsPDF): Promise<void> {
	const [bodyRegular, bodyBold, bodyItalic, headingRegular, headingBold, headingItalic] =
		await Promise.all([
			loadFont('/fonts/Rijksoverheid-regular.ttf'),
			loadFont('/fonts/Rijksoverheid-bold.ttf'),
			loadFont('/fonts/Rijksoverheid-italic.ttf'),
			loadFont('/fonts/Rijksoverheid-Heading-regular.ttf'),
			loadFont('/fonts/Rijksoverheid-Heading-bold.ttf'),
			loadFont('/fonts/Rijksoverheid-Heading-italic.ttf'),
		])

	// Body fonts
	doc.addFileToVFS('Rijksoverheid-Regular.ttf', bodyRegular)
	doc.addFont('Rijksoverheid-Regular.ttf', 'Rijksoverheid', 'normal')

	doc.addFileToVFS('Rijksoverheid-Bold.ttf', bodyBold)
	doc.addFont('Rijksoverheid-Bold.ttf', 'Rijksoverheid', 'bold')

	doc.addFileToVFS('Rijksoverheid-Italic.ttf', bodyItalic)
	doc.addFont('Rijksoverheid-Italic.ttf', 'Rijksoverheid', 'italic')

	// Heading fonts
	doc.addFileToVFS('Rijksoverheid-Heading-Regular.ttf', headingRegular)
	doc.addFont('Rijksoverheid-Heading-Regular.ttf', 'RijksoverheidHeading', 'normal')

	doc.addFileToVFS('Rijksoverheid-Heading-Bold.ttf', headingBold)
	doc.addFont('Rijksoverheid-Heading-Bold.ttf', 'RijksoverheidHeading', 'bold')

	doc.addFileToVFS('Rijksoverheid-Heading-Italic.ttf', headingItalic)
	doc.addFont('Rijksoverheid-Heading-Italic.ttf', 'RijksoverheidHeading', 'italic')
}
