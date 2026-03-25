/**
 * Error used when report generation fails.
 */
export class ReportGenerationError extends Error {
	/**
	 * Creates a report generation error.
	 *
	 * @param message - Human-readable error code or message.
	 * @param cause - Original cause.
	 */
	public constructor(message: string, cause?: unknown) {
		super(message, { cause })
		this.name = 'ReportGenerationError'
	}
}
