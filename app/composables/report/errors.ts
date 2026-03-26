/**
 * Canonical error codes for staged report generation.
 */
export type ReportGenerationErrorCode =
	| 'AI_WEBSITE_ANALYSIS_FAILED'
	| 'AI_BRIEFING_FAILED'
	| 'REPORT_GENERATION_FAILED'

/**
 * Error used when report generation fails.
 */
export class ReportGenerationError extends Error {
	/**
	 * Stable machine-readable code used by UI error handling.
	 */
	public readonly code: ReportGenerationErrorCode

	/**
	 * Creates a report generation error.
	 *
	 * @param code - Stable error code.
	 * @param cause - Original cause.
	 */
	public constructor(code: ReportGenerationErrorCode, cause?: unknown) {
		super(code, { cause })
		this.name = 'ReportGenerationError'
		this.code = code
	}
}
