/**
 * Shared markdown spacing tokens (in mm) used by both renderer and height
 * estimator. Keep these in sync to preserve predictable pagination.
 */
export const MARKDOWN_LAYOUT = {
	paragraphBottom: 1.5,
	headingBottom: 1.5,
	listItemBottom: 1,
	blockquoteTop: 1,
	blockquoteBottom: 1,
	horizontalRuleBottom: 10
} as const
