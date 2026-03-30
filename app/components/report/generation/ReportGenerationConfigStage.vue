<script lang="ts" setup>
import type { ReportConfig } from '~~/schema/reportConfig'

import { AI_WEBSITE_ANALYSIS_MAX_PAGES, AI_WEBSITE_ANALYSIS_MIN_PAGES } from '~~/schema/reportAi'

type ReportGenerationConfigStageProps = {
	/**
	 * Shared report config model used by the parent orchestration form.
	 */
	state: ReportConfig
	/**
	 * Current region input value synced with persisted store state.
	 */
	region: string
	/**
	 * Current notes/editor value synced with persisted store state.
	 */
	notes: string
	/**
	 * Current website URL value for optional website analysis.
	 */
	url: string | undefined
	/**
	 * Current bounded max-pages value for website analysis crawl depth.
	 */
	analysisMaxPages: number
	/**
	 * Whether at least one AI capability is currently enabled.
	 */
	hasAiEnabled: boolean
	/**
	 * User-facing ETA label for current AI selections.
	 */
	aiEstimatedDurationLabel: string
	/**
	 * Whether existing AI insights can be reused for unchanged inputs.
	 */
	hasReusableAiInsights: boolean
}

defineProps<ReportGenerationConfigStageProps>()

const emit = defineEmits<{
	'update:region': [value: string]
	'update:notes': [value: string | undefined]
	'update:url': [value: string | undefined]
	'update:analysisMaxPages': [value: number | undefined]
	'update:aiBriefing': [value: boolean]
	'update:aiWebsiteAnalysis': [value: boolean]
	'navigate-help': []
}>()

const { getIcon } = useIcons()
</script>

<template>
	<div class="space-y-6">
		<UFormField
			name="region"
			label="Naam van regio"
			description="Wat is de naam van jouw onderwijsregio? Deze wordt gebruikt op verschillende plekken in de rapportage."
		>
			<UInput
				:model-value="region"
				size="lg"
				placeholder="Voeg naam toe"
				@update:model-value="emit('update:region', $event)"
			/>
		</UFormField>

		<UFormField name="aiBriefing">
			<USwitch
				:model-value="state.aiBriefing"
				label="Gebruik AI voor briefing"
				description="Wil je AI inzetten om een briefing te schrijven voor je websitebouwer?"
				@update:model-value="emit('update:aiBriefing', Boolean($event))"
			/>
		</UFormField>
		<UFormField name="aiWebsiteAnalysis">
			<USwitch
				:model-value="state.aiWebsiteAnalysis"
				label="Gebruik AI voor website-analyse"
				description="Wil je AI inzetten om je huidige website te analyseren?"
				@update:model-value="emit('update:aiWebsiteAnalysis', Boolean($event))"
			/>
		</UFormField>
		<UAlert
			v-if="hasAiEnabled"
			:icon="getIcon('help')"
			color="info"
			variant="subtle"
			title="Verwachte wachttijd"
			:description="`Voor je huidige AI-selectie duurt dit meestal ${aiEstimatedDurationLabel}.`"
		/>
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
				@click="emit('navigate-help')"
			/>
		</p>
		<UFormField
			v-if="state.aiWebsiteAnalysis"
			name="url"
			label="Website URL"
			description="Voer de URL van je website in voor analyse."
		>
			<UInput
				:model-value="url"
				size="lg"
				placeholder="https://voorbeeld.nl"
				:icon="getIcon('url')"
				@update:model-value="emit('update:url', $event)"
			/>
		</UFormField>
		<UFormField
			v-if="state.aiWebsiteAnalysis"
			name="maxPages"
			label="Tot hoeveel pagina's wil je analyseren?"
			:description="`Kies tussen ${AI_WEBSITE_ANALYSIS_MIN_PAGES} en ${AI_WEBSITE_ANALYSIS_MAX_PAGES} pagina's. Des te meer pagina's je kiest, des te langer de analyse duurt.`"
		>
			<UInputNumber
				:model-value="analysisMaxPages"
				size="lg"
				:min="AI_WEBSITE_ANALYSIS_MIN_PAGES"
				:max="AI_WEBSITE_ANALYSIS_MAX_PAGES"
				:step="1"
				@update:model-value="emit('update:analysisMaxPages', $event)"
			/>
		</UFormField>
		<UFormField
			name="notes"
			label="Algemene opmerkingen"
			description="Voeg opmerkingen toe om op te nemen in de rapportage."
		>
			<Editor
				:model-value="notes"
				class="mt-2"
				outline
				placeholder="Plaats jouw opmerkingen hier..."
				@update:model-value="emit('update:notes', $event)"
			/>
		</UFormField>
	</div>
</template>
