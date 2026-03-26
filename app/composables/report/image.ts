/**
 * Loads an image asset and converts it to a data URL for jsPDF.
 *
 * @param url - Image URL.
 * @returns Base64 data URL string.
 * @throws {Error} When the image cannot be fetched.
 */
export async function loadImageAsBase64(url: string): Promise<string> {
	const res = await fetch(url)

	if (!res.ok) {
		throw new Error(`Failed to load image: ${url}`)
	}

	const blob = await res.blob()

	return await new Promise<string>((resolve, reject) => {
		const reader = new FileReader()

		reader.onload = () => resolve(reader.result as string)
		reader.onerror = reject

		reader.readAsDataURL(blob)
	})
}
