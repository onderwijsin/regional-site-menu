import type { ViewMode } from '~~/shared/types/primitives'

export type TrackingEvent =
	| 'ai_action'
	| 'ai_insight'
	| 'search'
	| 'filter'
	| 'audit_score'
	| 'report_generation'
	| 'mode_switch'

export type AiActionLabel = 'chatgpt' | 'claude' | 'markdown'
export type AiActionValue = 'sparren' | 'open_item' | 'copy' | 'view'
export type AiInsightTool = 'website_analysis' | 'briefing'

export interface TrackEventParams {
	event_category: 'engagement' | 'ui'
	event_label?: string
	event_value?: string
	item_id?: string
	score?: string
	scored_elements_count?: string
	from_mode?: ViewMode
	to_mode?: ViewMode
	source?: 'header_tabs' | 'welcome_modal'
}

/**
 * Composable that exposes a thin wrapper around the global analytics `useTrackEvent` helper.
 *
 * This composable:
 * - Checks the current privacy/tracking consent via {@link usePrivacy}
 * - Ensures tracking is only executed on the client (`import.meta.client`)
 * - Forwards the event name and payload to `useTrackEvent` in a consistent shape
 *
 * Typical usage:
 *
 * ```ts
 * const { trackEvent } = useTracking()
 *
 * trackEvent('login', {
 *   event_category: 'auth',
 *   event_label: 'login_success',
 * })
 * ```
 *
 * @returns An object with:
 * - `trackEvent`: Function to send a typed tracking event with analytics payload.
 */
export const useTracking = () => {
	const { disabled } = useRuntimeConfig().public.tracking
	/**
	 * Send a tracking event to the analytics layer when tracking is allowed.
	 *
	 * The event is only sent when:
	 * - The user has consented to tracking (via {@link usePrivacy})
	 * - The code runs on the client (`import.meta.client`)
	 *
	 * @param event_name - Name of the event to track. Prefer one of the
	 *                     predefined {@link TrackingEvent} values, but arbitrary
	 *                     strings are also accepted for flexibility.
	 * @param payload - Analytics payload describing the event context, including
	 *                  category and optional label/value.
	 *
	 * @example
	 * ```ts
	 * const { trackEvent } = useTracking()
	 *
	 * trackEvent('app_installed', {
	 *   event_category: 'engagement',
	 *   event_label: 'pwa_install_prompt_accepted',
	 * })
	 * ```
	 */

	const trackEvent = (event_name: TrackingEvent, payload: TrackEventParams) => {
		if (disabled || !import.meta.client) return
		useTrackEvent(event_name, { props: { ...payload } })
	}

	/**
	 * Track a constrained AI-related action.
	 *
	 * @param params - AI action metadata.
	 * @returns Nothing.
	 */
	const trackAiAction = (params: { label: AiActionLabel; value: AiActionValue }): void => {
		trackEvent('ai_action', {
			event_category: 'engagement',
			event_label: params.label,
			event_value: params.value
		})
	}

	/**
	 * Track usage of report AI insight endpoints.
	 *
	 * This is intentionally emitted only when an actual AI endpoint call is made,
	 * not when a user toggles switches in the UI.
	 *
	 * @param params - Endpoint call metadata.
	 * @returns Nothing.
	 */
	const trackAiInsight = (params: { tool: AiInsightTool }): void => {
		trackEvent('ai_insight', {
			event_category: 'engagement',
			event_label: params.tool,
			event_value: 'endpoint_call'
		})
	}

	/**
	 * Track when a user assigns a score to a menu element.
	 *
	 * @param params - Scoring event payload.
	 * @returns Nothing.
	 */
	const trackAuditScore = (params: { itemId: string; score: number }): void => {
		if (!Number.isInteger(params.score) || params.score < 1 || params.score > 10) {
			return
		}

		trackEvent('audit_score', {
			event_category: 'engagement',
			event_label: 'set',
			event_value: `${params.score}`,
			item_id: params.itemId,
			score: `${params.score}`
		})
	}

	/**
	 * Track successful report generation.
	 *
	 * @param params - Report metrics for analytics.
	 * @returns Nothing.
	 */
	const trackReportGenerated = (params: { scoredElementsCount: number }): void => {
		trackEvent('report_generation', {
			event_category: 'engagement',
			event_label: 'generated',
			event_value: 'pdf',
			scored_elements_count: `${params.scoredElementsCount}`
		})
	}

	/**
	 * Track mode switch between explore and edit.
	 *
	 * @param params - Transition metadata.
	 * @returns Nothing.
	 */
	const trackModeSwitch = (params: {
		from: ViewMode
		to: ViewMode
		source: 'header_tabs' | 'welcome_modal'
	}): void => {
		if (params.from === params.to) {
			return
		}

		trackEvent('mode_switch', {
			event_category: 'ui',
			event_label: 'switch',
			event_value: `${params.from}_to_${params.to}`,
			from_mode: params.from,
			to_mode: params.to,
			source: params.source
		})
	}

	return {
		trackEvent,
		trackAiAction,
		trackAiInsight,
		trackAuditScore,
		trackReportGenerated,
		trackModeSwitch
	}
}
