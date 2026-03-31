<script lang="ts" setup>
import type { ItemsCollectionItem } from '@nuxt/content'
import type { ReportGenerationStage } from '~/composables/report-generation-execution'
import type { ReportAiInsights } from '~~/schema/reportAi'
import type { ReportConfig } from '~~/schema/reportConfig'
import type { Audit, PillarAverage } from '~~/shared/types/audit'
import type { Pillar } from '~~/shared/types/primitives'

import {
	buildReportPdfAiInsights,
	createReportAiInputSignature,
	hasGeneratedReportAiInsights
} from '~/composables/report-generation-flow'
import {
	getReportAiEstimatedDurationLabel,
	getReportGenerationStageMeta
} from '~/composables/report-generation-ui'
import {
	applyReportLoadingToolActiveTransition,
	applyReportLoadingToolOpenChange,
	isReportLoadingToolOpen
} from '~/composables/report-loading-tools'
import {
	AI_WEBSITE_ANALYSIS_DEFAULT_PAGES,
	AI_WEBSITE_ANALYSIS_MAX_PAGES,
	AI_WEBSITE_ANALYSIS_MIN_PAGES
} from '~~/schema/reportAi'
import { ReportConfigSchema } from '~~/schema/reportConfig'

type ReportGenerationFlowProps = {
	data: {
		averages: PillarAverage<Pillar>[]
		audits: Audit<ItemsCollectionItem>[]
	}
}

const props = defineProps<ReportGenerationFlowProps>()

const emit = defineEmits<{
	(e: 'close'): void
}>()

const form = useTemplateRef('form')
const stateStore = useStateStore()

const state = reactive<ReportConfig>({
	region: stateStore.region,
	aiBriefing: false,
	aiWebsiteAnalysis: false,
	url: stateStore.url,
	maxPages: AI_WEBSITE_ANALYSIS_DEFAULT_PAGES,
	notes: stateStore.notes
})

/**
 * Keep form fields in sync with persisted store values.
 */
const region = computed({
	get: () => stateStore.region,
	set: (value: string) => {
		state.region = value
		stateStore.region = value
	}
})

const notes = computed({
	get: () => stateStore.notes,
	set: (value: string) => {
		state.notes = value
		stateStore.notes = value
	}
})

const url = computed({
	get: () => stateStore.url,
	set: (value: string) => {
		if (value.trim() === '') {
			state.url = undefined
			stateStore.url = undefined
		} else {
			state.url = value
			stateStore.url = value
		}
	}
})

const analysisMaxPages = computed({
	get: () => state.maxPages ?? AI_WEBSITE_ANALYSIS_DEFAULT_PAGES,
	set: (value: number) => {
		if (Number.isNaN(value)) {
			return
		}

		state.maxPages = Math.min(
			AI_WEBSITE_ANALYSIS_MAX_PAGES,
			Math.max(AI_WEBSITE_ANALYSIS_MIN_PAGES, Math.round(value))
		)
	}
})

const stage = ref<ReportGenerationStage>('config')
const aiInsights = ref<ReportAiInsights>()
const briefingDraft = ref('')
const isAiLoading = ref(false)
const isGeneratingPdf = ref(false)
const aiTurnstile = ref<{ reset: () => void }>()
const {
	token: aiTurnstileToken,
	isEnabled: isTurnstileEnabled,
	getTokenWithRetry,
	isReady: isTurnstileReady,
	reset: resetTurnstile,
	showPendingHint,
	showMissingTokenErrorHint
} = useTurnstile()

const { generateReport } = useReportGenerator()
const { generateAiInsights, progress, abortGeneration } = useReportAi({
	getTurnstileToken: getAiTurnstileToken,
	onTurnstileConsumed: () => {
		resetTurnstile(aiTurnstile.value)
	}
})
const { trackReportGenerated } = useTracking()
const confirm = useConfirmDialog()
const { getIcon } = useIcons()

const hasAiEnabled = computed(() => state.aiBriefing || state.aiWebsiteAnalysis)
const isBusy = computed(() => isAiLoading.value || isGeneratingPdf.value)
const isClosing = ref(false)
const aiInsightsInputSignature = ref<string>()
const activeLoadingToolId = computed(
	() => progress.value.findLast((entry) => entry.status === 'running')?.id
)
const loadingToolOpenState = ref<Record<string, boolean>>({})

/**
 * Flow overview:
 *
 * 1) `config`: collect region/report/AI preferences
 * 2) `ai-loading`: staged progress for AI endpoint calls
 * 3) `briefing-review`: editable briefing before PDF generation
 *
 * The component also keeps AI output in local reactive state and compares
 * input signatures, so users can go back and forward without expensive
 * re-generation when nothing relevant changed.
 */

const stageMeta = computed(() => getReportGenerationStageMeta(stage.value))

const aiSignatureAudits = computed(() =>
	props.data.audits.map((audit) => ({
		id: audit.id,
		score: audit.score ?? null,
		comment: audit.comment
	}))
)

const currentAiInputSignature = computed(() =>
	createReportAiInputSignature(state, aiSignatureAudits.value)
)

/**
 * Whether AI insights exist in local state.
 */
const hasGeneratedAiInsights = computed(() => hasGeneratedReportAiInsights(aiInsights.value))

/**
 * Whether current form input still matches the generated AI insights.
 */
const hasReusableAiInsights = computed(() => {
	if (!hasGeneratedAiInsights.value || !aiInsightsInputSignature.value) {
		return false
	}

	return aiInsightsInputSignature.value === currentAiInputSignature.value
})

const shouldConfirmBeforeClose = computed(() => isBusy.value || hasGeneratedAiInsights.value)

const configSubmitLabel = computed(() => {
	if (!hasAiEnabled.value) {
		return 'Maak rapportage'
	}

	return hasReusableAiInsights.value ? 'Ga verder met AI-inzichten' : 'Genereer AI-inzichten'
})

const aiEstimatedDurationLabel = computed(() => getReportAiEstimatedDurationLabel(state))

/**
 * Handles region updates from the config stage UI.
 *
 * @param value - Next region value.
 * @returns Nothing.
 */
function handleRegionUpdate(value: string): void {
	region.value = value
}

/**
 * Handles notes updates from the config stage UI.
 *
 * @param value - Next notes value.
 * @returns Nothing.
 */
function handleNotesUpdate(value: string | undefined): void {
	notes.value = value ?? ''
}

/**
 * Handles URL updates from the config stage UI.
 *
 * @param value - Next URL value from input.
 * @returns Nothing.
 */
function handleUrlUpdate(value: string | undefined): void {
	url.value = value ?? ''
}

/**
 * Handles max-pages updates from the config stage UI.
 *
 * @param value - Next max-pages value.
 * @returns Nothing.
 */
function handleAnalysisMaxPagesUpdate(value: number | undefined): void {
	if (typeof value !== 'number' || Number.isNaN(value)) {
		return
	}

	analysisMaxPages.value = value
}

/**
 * Handles AI briefing toggle changes from the config stage UI.
 *
 * @param value - Whether AI briefing is enabled.
 * @returns Nothing.
 */
function handleAiBriefingUpdate(value: boolean): void {
	state.aiBriefing = value
}

/**
 * Handles AI website-analysis toggle changes from the config stage UI.
 *
 * @param value - Whether website analysis is enabled.
 * @returns Nothing.
 */
function handleAiWebsiteAnalysisUpdate(value: boolean): void {
	state.aiWebsiteAnalysis = value
}

/**
 * Handles briefing updates from the review stage UI.
 *
 * @param value - Next briefing draft.
 * @returns Nothing.
 */
function handleBriefingDraftUpdate(value: string | undefined): void {
	briefingDraft.value = value ?? ''
}

/**
 * Builds final AI insights payload for PDF generation.
 *
 * Briefing uses the editable draft from stage 3 when enabled.
 *
 * @returns Optional AI insights object for the report generator.
 */
function getFinalAiInsights(): ReportAiInsights | undefined {
	return buildReportPdfAiInsights({
		config: state,
		aiInsights: aiInsights.value,
		briefingDraft: briefingDraft.value
	})
}

/**
 * Resolves open state for one loading tool entry.
 *
 * Active tools are always forced open. Completed tools use remembered
 * user-toggle state.
 *
 * @param toolId - Progress tool id.
 * @returns Whether the tool details should be expanded.
 */
function isLoadingToolOpen(toolId: string): boolean {
	return isReportLoadingToolOpen({
		toolId,
		activeToolId: activeLoadingToolId.value,
		openState: loadingToolOpenState.value
	})
}

/**
 * Persists user-driven open-state changes for completed loading tools.
 *
 * Active tools keep enforced open state.
 *
 * @param toolId - Progress tool id.
 * @param isOpen - Next open state from UI interaction.
 * @returns Nothing.
 */
function handleLoadingToolOpenChange(toolId: string, isOpen: boolean): void {
	loadingToolOpenState.value = applyReportLoadingToolOpenChange({
		openState: loadingToolOpenState.value,
		toolId,
		isOpen,
		activeToolId: activeLoadingToolId.value
	})
}

watch(activeLoadingToolId, (nextActiveToolId, previousActiveToolId) => {
	loadingToolOpenState.value = applyReportLoadingToolActiveTransition({
		openState: loadingToolOpenState.value,
		nextActiveToolId,
		previousActiveToolId
	})
})

watch(
	() => progress.value.length,
	(entryCount) => {
		// New AI run starts with a fresh progress list.
		if (entryCount === 0) {
			loadingToolOpenState.value = {}
		}
	}
)

const { handleConfigSubmit, handleBriefingSubmit, cancelOngoingGeneration } =
	useReportGenerationExecution({
		state,
		data: props.data,
		stage,
		aiInsights,
		aiInsightsInputSignature,
		briefingDraft,
		isAiLoading,
		isGeneratingPdf,
		hasAiEnabled,
		hasReusableAiInsights,
		currentAiInputSignature,
		getFinalAiInsights,
		generateReport,
		generateAiInsights,
		abortAiGeneration: abortGeneration,
		trackReportGenerated,
		beforeStartAiGeneration: ensureAiTurnstileReadyBeforeAiStage,
		onClose: () => emit('close')
	})

/**
 * Navigates to help page from inside the slideover.
 *
 * @returns Nothing.
 */
async function navigateToHelp() {
	useOverlay().closeAll()
	await navigateTo('/help')
}

async function getAiTurnstileToken(): Promise<string | undefined> {
	if (!isTurnstileEnabled.value) {
		return undefined
	}

	const token = await getTokenWithRetry()
	if (token) {
		return token
	}

	// In preview/prod a new token can occasionally arrive late after a previous
	// token was consumed by the first AI request. Force one refresh and retry.
	aiTurnstile.value?.reset()
	return await getTokenWithRetry()
}

async function ensureAiTurnstileReadyBeforeAiStage(): Promise<boolean> {
	if (!isTurnstileEnabled.value) {
		return true
	}

	if (!isTurnstileReady()) {
		showPendingHint()
	}

	const token = await getTokenWithRetry()
	if (token) {
		return true
	}

	showMissingTokenErrorHint()
	return false
}

/**
 * Guarded close handler for footer close button and slideover dismiss actions.
 *
 * @returns Nothing.
 */
async function handleClose(): Promise<void> {
	if (isClosing.value) {
		return
	}

	isClosing.value = true

	try {
		if (shouldConfirmBeforeClose.value) {
			const isGenerationInProgress = isAiLoading.value || isGeneratingPdf.value
			const confirmed = await confirm({
				title: isGenerationInProgress
					? 'AI-generatie is nog bezig'
					: 'AI-inzichten zijn nog niet verwerkt',
				description: isGenerationInProgress
					? 'De AI is nog bezig met genereren. Als je nu sluit, gaan de resultaten verloren en moet je opnieuw beginnen.'
					: 'Je AI-inzichten zijn al gegenereerd, maar nog niet verwerkt in het rapport. Als je het venster sluit, moet je opnieuw beginnen.',
				color: 'error',
				actions: [
					{
						label: 'Blijf op deze pagina',
						color: 'neutral',
						variant: 'soft',
						mode: 'cancel'
					},
					{
						label: 'Sluit en verlies voortgang',
						color: 'error',
						variant: 'solid',
						mode: 'confirm'
					}
				]
			})

			if (!confirmed) {
				return
			}
		}

		cancelOngoingGeneration()
		emit('close')
	} finally {
		isClosing.value = false
	}
}
</script>

<template>
	<USlideover
		:title="stageMeta.title"
		:description="stageMeta.description"
		:ui="{
			content: 'max-w-3xl',
			footer: 'justify-end flex gap-3'
		}"
		:close="false"
		:dismissible="false"
		@close:prevent="handleClose"
	>
		<template #body>
			<NuxtTurnstile
				v-if="isTurnstileEnabled"
				ref="aiTurnstile"
				v-model="aiTurnstileToken"
				:options="{ appearance: 'interaction-only' }"
				class="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
			/>

			<UForm
				v-if="stage === 'config'"
				ref="form"
				:state="state"
				:schema="ReportConfigSchema"
				class="space-y-6"
				@submit="handleConfigSubmit"
			>
				<ReportGenerationConfigStage
					:state="state"
					:region="region"
					:notes="notes"
					:url="url"
					:analysis-max-pages="analysisMaxPages"
					:has-ai-enabled="hasAiEnabled"
					:ai-estimated-duration-label="aiEstimatedDurationLabel"
					:has-reusable-ai-insights="hasReusableAiInsights"
					@update:region="handleRegionUpdate"
					@update:notes="handleNotesUpdate"
					@update:url="handleUrlUpdate"
					@update:analysis-max-pages="handleAnalysisMaxPagesUpdate"
					@update:ai-briefing="handleAiBriefingUpdate"
					@update:ai-website-analysis="handleAiWebsiteAnalysisUpdate"
					@navigate-help="navigateToHelp"
				/>
			</UForm>

			<ReportGenerationAiLoadingStage
				v-else-if="stage === 'ai-loading'"
				:progress="progress"
				:is-loading-tool-open="isLoadingToolOpen"
				@tool-open-change="handleLoadingToolOpenChange($event.toolId, $event.isOpen)"
			/>

			<ReportGenerationBriefingReviewStage
				v-else-if="stage === 'briefing-review'"
				:briefing-draft="briefingDraft"
				@update:briefing-draft="handleBriefingDraftUpdate"
			/>
		</template>

		<template #footer>
			<UButton label="Sluit" color="neutral" variant="soft" @click="handleClose" />

			<UButton
				v-if="stage === 'config'"
				:icon="getIcon('report')"
				:loading="isBusy"
				:label="configSubmitLabel"
				color="success"
				variant="soft"
				@click="form?.submit()"
			/>

			<UButton
				v-else-if="stage === 'ai-loading'"
				:icon="getIcon('ai')"
				:loading="true"
				label="AI-inzichten genereren"
				color="primary"
				variant="soft"
				disabled
			/>

			<template v-else-if="stage === 'briefing-review'">
				<UButton
					label="Terug"
					color="neutral"
					variant="soft"
					:disabled="isGeneratingPdf"
					@click="stage = 'config'"
				/>
				<UButton
					:icon="getIcon('report')"
					:loading="isGeneratingPdf"
					label="Maak rapportage"
					color="success"
					variant="soft"
					@click="handleBriefingSubmit"
				/>
			</template>
		</template>
	</USlideover>
</template>
