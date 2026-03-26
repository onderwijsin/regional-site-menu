<script lang="ts" setup>
import type { ItemsCollectionItem } from '@nuxt/content'
import type { ReportConfig } from '~~/schema/reportConfig'
import type { Audit, PillarAverage } from '~~/shared/types/audit'

import { ReportConfigSchema } from '~~/schema/reportConfig'

type ReportConfigProps = {
	data: {
		averages: PillarAverage<ItemsCollectionItem['pillar']>[]
		audits: Audit<ItemsCollectionItem>[]
	}
}

const props = defineProps<ReportConfigProps>()

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
 * These values need to be synced back from local state, to the store
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

const isGenerating = ref(false)
const { generateReport } = useReportGenerator()
const toast = useToast()
const { getIcon } = useIcons()

async function startReportGeneration(): Promise<void> {
	isGenerating.value = true

	try {
		await generateReport(state, {
			audits: props.data.audits,
			averages: props.data.averages,
		})

		emit('close')
	} catch {
		toast.add({
			icon: getIcon('error'),
			title: 'Fout bij het genereren van het rapport',
			color: 'error',
			duration: 6000,
		})
	} finally {
		isGenerating.value = false
	}
}

async function navigateToHelp() {
	useOverlay().closeAll()
	await navigateTo('/help')
}
</script>

<template>
	<USlideover
		title="Genereer rapportage"
		description="Met jouw input en beoordelingen maken we een rapportage die je als PDF kunt downloaden."
		:ui="{
			content: 'max-w-3xl',
			footer: 'justify-end flex gap-3',
		}"
	>
		<template #body>
			<UForm
				ref="form"
				:state="state"
				:schema="ReportConfigSchema"
				class="space-y-6"
				@submit="startReportGeneration"
			>
				<UFormField
					name="region"
					label="Naam van regio"
					description="Wat is de naam van jouw onderwijsregio? Deze wordt gebruikt op het voorblad van de rapportage."
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
		</template>
		<template #footer>
			<UButton label="Sluit" color="neutral" variant="soft" @click="emit('close')" />
			<UButton
				:icon="getIcon('report')"
				:loading="isGenerating"
				label="Maak rapportage"
				color="success"
				variant="soft"
				@click="form?.submit()"
			/>
		</template>
	</USlideover>
</template>
