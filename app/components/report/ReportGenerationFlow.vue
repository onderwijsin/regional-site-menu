<script lang="ts" setup>
import type { ItemsCollectionItem } from '@nuxt/content'
import type { ReportAiInsights } from '~~/schema/reportAi'
import type { ReportConfig } from '~~/schema/reportConfig'
import type { Audit, PillarAverage } from '~~/shared/types/audit'
import type { Pillar } from '~~/shared/types/primitives'

import {
	buildReportPdfAiInsights,
	createReportAiInputSignature,
	hasGeneratedReportAiInsights,
} from '~/composables/report-generation-flow'
import { ReportGenerationError } from '~/composables/report/errors'
import { ReportConfigSchema } from '~~/schema/reportConfig'

type ReportGenerationFlowProps = {
	data: {
		averages: PillarAverage<Pillar>[]
		audits: Audit<ItemsCollectionItem>[]
	}
}

type ReportGenerationStage = 'config' | 'ai-loading' | 'briefing-review'

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
	notes: stateStore.notes,
})

/**
 * Keep form fields in sync with persisted store values.
 */
const region = computed({
	get: () => stateStore.region,
	set: (value: string) => {
		state.region = value
		stateStore.region = value
	},
})

const notes = computed({
	get: () => stateStore.notes,
	set: (value: string) => {
		state.notes = value
		stateStore.notes = value
	},
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
	},
})

const stage = ref<ReportGenerationStage>('config')
const aiInsights = ref<ReportAiInsights>()
const briefingDraft = ref('')
const isAiLoading = ref(false)
const isGeneratingPdf = ref(false)

const { generateReport } = useReportGenerator()
const { generateAiInsights, progress } = useReportAi()
const { trackReportGenerated } = useTracking()
const confirm = useConfirmDialog()
const toast = useToast()
const { getIcon } = useIcons()

const hasAiEnabled = computed(() => state.aiBriefing || state.aiWebsiteAnalysis)
const isBusy = computed(() => isAiLoading.value || isGeneratingPdf.value)
const isClosing = ref(false)
const aiInsightsInputSignature = ref<string>()
const activeLoadingToolId = computed(
	() => progress.value.findLast((entry) => entry.status === 'running')?.id,
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
					'We genereren nu de verschillende AI-inzichten. Dit kan enige tijd duren.',
			}
		case 'briefing-review':
			return {
				title: 'Controleer AI-briefing',
				description:
					'Controleer en bewerk de gegenereerde briefing voordat het PDF-rapport wordt gemaakt.',
			}
		default:
			return {
				title: 'Genereer rapportage',
				description:
					'Met jouw input en beoordelingen maken we een rapportage die je als PDF kunt downloaden.',
			}
	}
})

/**
 * Maps generation failures to user-facing Dutch copy.
 *
 * @param error - Unknown thrown value from generation flow.
 * @returns Description for toast message.
 */
function getReportFailureDescription(error: unknown): string {
	if (error instanceof ReportGenerationError) {
		switch (error.code) {
			case 'AI_WEBSITE_ANALYSIS_FAILED':
				return 'Het lukte niet op de opgegeven website te analyseren'
			case 'AI_BRIEFING_FAILED':
				return 'Het lukte niet om een briefing te genereren'
			default:
				return 'Het lukte niet om je audit te verwerken'
		}
	}

	return 'Het lukte niet om je audit te verwerken'
}

/**
 * Shows one consistent toast for report-flow failures.
 *
 * @param error - Unknown thrown value.
 * @returns Nothing.
 */
function showGenerationErrorToast(error: unknown): void {
	console.error('Rapport generatie mislukt', error)

	toast.add({
		icon: getIcon('error'),
		title: 'Rapport genereren mislukt',
		description: getReportFailureDescription(error),
		color: 'error',
		duration: 10000,
	})
}

const aiSignatureAudits = computed(() =>
	props.data.audits.map((audit) => ({
		id: audit.id,
		score: audit.score ?? null,
		comment: audit.comment,
	})),
)

const currentAiInputSignature = computed(() =>
	createReportAiInputSignature(state, aiSignatureAudits.value),
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
		briefingDraft: briefingDraft.value,
	})
}

/**
 * Generates the final PDF with optional AI insights.
 *
 * @returns Nothing.
 * @throws {unknown} Propagates report generation failures to caller.
 */
async function startPdfGeneration(): Promise<void> {
	isGeneratingPdf.value = true

	try {
		const reportData = {
			audits: props.data.audits,
			averages: props.data.averages,
		}

		await generateReport(state, {
			...reportData,
			aiInsights: getFinalAiInsights(),
		})

		trackReportGenerated({
			scoredElementsCount: props.data.audits.length,
		})

		emit('close')
	} finally {
		isGeneratingPdf.value = false
	}
}

/**
 * Runs stage 2 AI generation and routes to the next stage.
 *
 * - When briefing is enabled: open review editor
 * - Otherwise: continue directly to PDF generation
 *
 * @returns Nothing.
 */
async function startAiGenerationFlow(): Promise<void> {
	stage.value = 'ai-loading'
	isAiLoading.value = true
	aiInsights.value = undefined
	aiInsightsInputSignature.value = undefined
	briefingDraft.value = ''

	try {
		const reportData = {
			audits: props.data.audits,
			averages: props.data.averages,
		}

		const generatedInsights = await generateAiInsights(state, reportData)
		aiInsights.value = generatedInsights
		aiInsightsInputSignature.value = currentAiInputSignature.value

		// When briefing is enabled, force an explicit human review/edit step
		// before allowing final PDF generation.
		if (state.aiBriefing && generatedInsights.briefing?.trim()) {
			briefingDraft.value = generatedInsights.briefing
			stage.value = 'briefing-review'
			return
		}

		await startPdfGeneration()
	} catch (error: unknown) {
		stage.value = 'config'
		showGenerationErrorToast(error)
	} finally {
		isAiLoading.value = false
	}
}

/**
 * Entry submit action for stage 1 config form.
 *
 * @returns Nothing.
 */
async function handleConfigSubmit(): Promise<void> {
	if (hasAiEnabled.value) {
		// Reuse previously generated insights when all relevant inputs are unchanged.
		// This avoids unnecessary and costly repeated AI endpoint calls.
		if (hasReusableAiInsights.value) {
			if (state.aiBriefing) {
				stage.value = 'briefing-review'
				return
			}

			try {
				await startPdfGeneration()
			} catch (error: unknown) {
				showGenerationErrorToast(error)
			}

			return
		}

		await startAiGenerationFlow()
		return
	}

	try {
		await startPdfGeneration()
	} catch (error: unknown) {
		showGenerationErrorToast(error)
	}
}

/**
 * Final submit action from briefing review stage.
 *
 * @returns Nothing.
 */
async function handleBriefingSubmit(): Promise<void> {
	try {
		await startPdfGeneration()
	} catch (error: unknown) {
		showGenerationErrorToast(error)
	}
}

/**
 * Navigates to help page from inside the slideover.
 *
 * @returns Nothing.
 */
async function navigateToHelp() {
	useOverlay().closeAll()
	await navigateTo('/help')
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
						mode: 'cancel',
					},
					{
						label: 'Sluit en verlies voortgang',
						color: 'error',
						variant: 'solid',
						mode: 'confirm',
					},
				],
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
			footer: 'justify-end flex gap-3',
		}"
		:close="false"
		:dismissible="false"
		@close:prevent="handleClose"
	>
		<template #body>
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
