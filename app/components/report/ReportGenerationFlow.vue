<script lang="ts" setup>
import type { ItemsCollectionItem } from '@nuxt/content'
import type { ReportGenerationStage } from '~/composables/report-generation-execution'
import type { ReportAiInsights } from '~~/schema/reportAi'
import type { ReportConfig } from '~~/schema/reportConfig'
import type { Audit, PillarAverage } from '~~/shared/types/audit'
import type { Pillar } from '~~/shared/types/primitives'

import { useReportGenerationExecution } from '~/composables/report-generation-execution'
import {
	buildReportPdfAiInsights,
	createReportAiInputSignature,
	hasGeneratedReportAiInsights
} from '~/composables/report-generation-flow'
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
const { generateAiInsights, progress } = useReportAi({
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

const stageMeta = computed(() => {
	switch (stage.value) {
		case 'ai-loading':
			return {
				title: 'AI-inzichten genereren',
				description:
					'We genereren nu de verschillende AI-inzichten. Dit kan enige tijd duren.'
			}
		case 'briefing-review':
			return {
				title: 'Controleer AI-briefing',
				description:
					'Controleer en bewerk de gegenereerde briefing voordat het PDF-rapport wordt gemaakt.'
			}
		default:
			return {
				title: 'Genereer rapportage',
				description:
					'Met jouw input en beoordelingen maken we een rapportage die je als PDF kunt downloaden.'
			}
	}
})

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

const { handleConfigSubmit, handleBriefingSubmit } = useReportGenerationExecution({
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
				<UFormField
					name="region"
					label="Naam van regio"
					description="Wat is de naam van jouw onderwijsregio? Deze wordt gebruikt op verschillende plekken in de rapportage."
				>
					<UInput v-model="region" size="lg" placeholder="Voeg naam toe" />
				</UFormField>

				<UFormField name="aiBriefing">
					<USwitch
						v-model="state.aiBriefing"
						label="Gebruik AI voor briefing"
						description="Wil je AI inzetten om een briefing te schrijven voor je websitebouwer?"
					/>
				</UFormField>
				<UFormField name="aiWebsiteAnalysis">
					<USwitch
						v-model="state.aiWebsiteAnalysis"
						label="Gebruik AI voor website-analyse"
						description="Wil je AI inzetten om je huidige website te analyseren?"
					/>
				</UFormField>
				<UAlert
					v-if="hasReusableAiInsights"
					:icon="getIcon('success')"
					color="success"
					variant="subtle"
					title="Eerder gegenereerde AI-inzichten beschikbaar"
					description="Je kunt direct doorgaan zonder opnieuw AI-calls te doen."
				/>

				<p class="text-muted text-sm italic">
					Meer informatie over de inzet van AI-tools kun je lezen op
					<UButton
						:icon="getIcon('help')"
						color="neutral"
						size="sm"
						label="onze helppagina"
						variant="link"
						class="relative top-1"
						@click="navigateToHelp"
					/>
				</p>
				<UFormField
					v-if="state.aiWebsiteAnalysis"
					name="url"
					label="Website URL"
					description="Voer de URL van je website in voor analyse."
				>
					<UInput
						v-model="url"
						size="lg"
						placeholder="https://voorbeeld.nl"
						:icon="getIcon('url')"
					/>
				</UFormField>
				<UFormField
					v-if="state.aiWebsiteAnalysis"
					name="maxPages"
					label="Tot hoeveel pagina's wil je analyseren?"
					:description="`Kies tussen ${AI_WEBSITE_ANALYSIS_MIN_PAGES} en ${AI_WEBSITE_ANALYSIS_MAX_PAGES} pagina's. Des te meer pagina's je kiest, des te langer de analyse duurt.`"
				>
					<UInputNumber
						v-model="analysisMaxPages"
						size="lg"
						:min="AI_WEBSITE_ANALYSIS_MIN_PAGES"
						:max="AI_WEBSITE_ANALYSIS_MAX_PAGES"
						:step="1"
					/>
				</UFormField>
				<UFormField
					name="notes"
					label="Algemene opmerkingen"
					description="Voeg opmerkingen toe om op te nemen in de rapportage."
				>
					<Editor
						v-model="notes"
						class="mt-2"
						outline
						placeholder="Plaats jouw opmerkingen hier..."
					/>
				</UFormField>
			</UForm>

			<div v-else-if="stage === 'ai-loading'" class="space-y-4">
				<UAlert
					:icon="getIcon('ai')"
					color="primary"
					variant="subtle"
					title="AI-inzichten worden opgebouwd"
					description="Je ziet hieronder stap voor stap wat er gebeurt en waar de AI momenteel mee bezig is."
				/>

				<UChatTool
					v-if="progress.length === 0"
					:text="'Voorbereiden...'"
					:streaming="true"
					:loading="true"
					:icon="getIcon('ai')"
					chevron="leading"
					disabled
				>
					De AI-taak wordt klaargezet.
				</UChatTool>

				<UChatTool
					v-for="entry in progress"
					:key="entry.id"
					:text="entry.text"
					:streaming="entry.status === 'running'"
					:loading="entry.status === 'running'"
					:icon="entry.status === 'running' ? getIcon('refresh') : getIcon('success')"
					:disabled="entry.status === 'running'"
					:open="entry.id === activeLoadingToolId"
					chevron="leading"
					variant="inline"
					class="transition-opacity duration-300"
					:class="entry.status === 'completed' ? 'opacity-45' : 'opacity-100'"
				>
					{{ entry.reasoning }}
				</UChatTool>
			</div>

			<div v-else-if="stage === 'briefing-review'" class="space-y-4">
				<UAlert
					:icon="getIcon('edit')"
					color="info"
					variant="subtle"
					title="Controleer en bewerk de AI-briefing"
					description="Pas de briefing aan waar nodig. Jouw aangepaste versie wordt opgenomen in het PDF-rapport."
				/>

				<UFormField
					name="briefing"
					label="AI-briefing"
					description="Controleer de inhoud en maak eventuele aanpassingen."
				>
					<Editor
						v-model="briefingDraft"
						outline
						placeholder="De gegenereerde briefing verschijnt hier..."
					/>
				</UFormField>
			</div>
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
