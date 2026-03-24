<script lang="ts" setup>
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Submission } from '@schema/submission'

import { SubmissionSchema } from '@schema/submission'

const toast = useToast()
const form = useTemplateRef('form')

const emit = defineEmits<{
	(e: 'close'): void
}>()

const DEFAULT_BODY = `
## Waarom is dit belangrijk

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore
et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
aliquip ex ea commodo consequat.

## Tips bij het implementeren

- Lorem ipsum dolor sit amet
- Lorem ipsum dolor sit amet
- Lorem ipsum dolor sit amet

## Goede voorbeelden

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore
et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
aliquip ex ea commodo consequat.
`

const state = reactive<Submission>({
	title: '',
	description: '',
	body: DEFAULT_BODY,
	pillar: 'Inzicht & Overzicht',
	goals: [],
	exampleUrl: '',
})

const goalOptions: { label: string; value: Submission['goals'][number] }[] = [
	{ label: 'Enthousiasmeren', value: 'Enthousiasmeren' },
	{ label: 'Informeren', value: 'Informeren' },
	{ label: 'Activeren', value: 'Activeren' },
]

const pillarOptions: { label: string; value: Submission['pillar'] }[] = [
	{ label: 'Inzicht & Overzicht', value: 'Inzicht & Overzicht' },
	{ label: 'Verdieping & Ervaring', value: 'Verdieping & Ervaring' },
	{ label: 'Activatie & Deelname', value: 'Activatie & Deelname' },
	{ label: 'Ondersteuning & Contact', value: 'Ondersteuning & Contact' },
]

const isSubmitting = ref(false)

async function onSubmit(event: FormSubmitEvent<Submission>) {
	const formData = event.data
	isSubmitting.value = true
	try {
		await $fetch('/api/datahub/submission', {
			method: 'POST',
			body: formData,
		})
		toast.add({
			title: 'Gelukt!',
			description:
				'Bedankt voor je suggestie. We gaan deze bekijken en zo snel mogelijk actie ondernemen.',
			color: 'success',
			icon: 'lucide:badge-check',
		})
		emit('close')
	} catch (error) {
		console.error('Error submitting form:', error)
		toast.add({
			title: 'Fout bij het indienen',
			description:
				'Er is een fout opgetreden bij het indienen van het formulier. Probeer het later opnieuw.',
			color: 'error',
			icon: 'lucide:badge-alert',
		})
	} finally {
		isSubmitting.value = false
	}
}
</script>

<template>
	<USlideover
		title="Doe een suggestie"
		description="Ontbreekt er iets in het menu? Hier kun je een suggestie doen om toe te voegen aan het overzicht."
		:ui="{ content: 'max-w-3xl' }"
	>
		<template #body>
			<UForm
				ref="form"
				:state="state"
				:schema="SubmissionSchema"
				:ui="{ base: 'space-y-6' }"
				@submit="onSubmit"
			>
				<UFormField
					name="title"
					label="Naam"
					description="De naam van het onderdeel dat je toe wilt voegen"
				>
					<UInput v-model="state.title" size="lg" placeholder="Voeg een naam toe" />
				</UFormField>
				<UFormField
					name="description"
					label="Beschrijving"
					description="Een korte beschrijving van het onderdeel dat je toe wilt voegen"
				>
					<UTextarea
						v-model="state.description"
						size="lg"
						placeholder="Voeg een korte beschrijving toe"
					/>
				</UFormField>
				<UFormField
					name="pillar"
					label="Categorie"
					description="In welke categorie valt dit onderdeel?"
				>
					<USelectMenu
						v-model="state.pillar"
						size="lg"
						value-key="value"
						label-key="label"
						:items="pillarOptions"
						placeholder="Kies een categorie"
					/>
				</UFormField>
				<UFormField
					name="goals"
					label="Doelen"
					description="Wat zijn de doelen van dit onderdeel?"
				>
					<USelectMenu
						v-model="state.goals"
						size="lg"
						value-key="value"
						label-key="label"
						:items="goalOptions"
						multiple
						placeholder="Kies een doel"
					/>
				</UFormField>
				<UFormField
					name="exampleUrl"
					label="Voorbeeld URL"
					description="URL van een webpagina waar we een voorbeeld van het onderdeel kunnen bekijken"
				>
					<UInput
						v-model="state.exampleUrl"
						size="lg"
						type="url"
						icon="lucide:link"
						placeholder="https://voorbeeld.nl"
					/>
				</UFormField>
				<UFormField
					name="body"
					label="Inhoud"
					description="De inhoud van het onderdeel dat je toe wilt voegen. Vervang de dummytekst door de daadwerkelijke inhoud."
				>
					<Editor
						v-model="state.body"
						outline
						placeholder="Voeg de inhoud toe bij de suggestie die je wilt doen."
					/>
				</UFormField>
			</UForm>
		</template>
		<template #footer>
			<UButton
				type="submit"
				:loading="isSubmitting"
				:disabled="isSubmitting"
				color="success"
				variant="soft"
				icon="lucide:send"
				@click="form?.submit()"
			>
				Verstuur
			</UButton>
		</template>
	</USlideover>
</template>
