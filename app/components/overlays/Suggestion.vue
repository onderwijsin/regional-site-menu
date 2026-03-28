<script lang="ts" setup>
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Submission } from '@schema/submission'
import type { Ref } from 'vue'

import { SUGGESTION_FORM_CONFIG } from '@constants'
import { SubmissionSchema } from '@schema/submission'
import { GOALS, PILLARS } from '~/composables/content-taxonomy'

const toast = useToast()
const form = useTemplateRef('form')
const { getIcon } = useIcons()
const runtimeConfig = useRuntimeConfig()

const emit = defineEmits<{
	(e: 'close'): void
}>()

const state = reactive<Submission>({
	title: '',
	description: '',
	body: SUGGESTION_FORM_CONFIG.defaultBody,
	category: PILLARS[0],
	email: undefined,
	goals: [],
	exampleUrl: ''
})

const email = computed({
	get: () => state.email,
	set: (value: string) => {
		if (value.trim() === '') {
			state.email = undefined
		} else {
			state.email = value
		}
	}
})

const goalOptions: { label: string; value: Submission['goals'][number] }[] = GOALS.map((goal) => ({
	label: goal,
	value: goal
}))

const categoryOptions: { label: string; value: Submission['category'] }[] = [
	...PILLARS.map((pillar) => ({
		label: pillar,
		value: pillar
	})),
	{ label: 'Handige extra', value: 'extra' }
]

const isSubmitting = ref(false)
const turnstileToken = ref<string>()
const turnstile = ref<{ reset: () => void }>()
const isTurnstileEnabled = computed(
	() => runtimeConfig.public.turnstile?.siteKey?.trim().length > 0
)

async function onSubmit(event: FormSubmitEvent<Submission>) {
	const formData = event.data
	isSubmitting.value = true
	try {
		const token = await getSuggestionTurnstileToken()

		await $fetch('/api/datahub/submission', {
			method: 'POST',
			body: formData,
			headers: token ? { 'x-turnstile-token': token } : undefined
		})
		toast.add({
			title: 'Gelukt!',
			description:
				'Bedankt voor je suggestie. We gaan deze bekijken en zo snel mogelijk actie ondernemen.',
			color: 'success',
			icon: getIcon('success')
		})
		emit('close')
	} catch (error) {
		console.error('Error submitting form:', error)
		toast.add({
			title: 'Fout bij het indienen',
			description:
				'Er is een fout opgetreden bij het indienen van het formulier. Probeer het later opnieuw.',
			color: 'error',
			icon: getIcon('warn')
		})
	} finally {
		isSubmitting.value = false
		if (isTurnstileEnabled.value) {
			turnstileToken.value = undefined
			turnstile.value?.reset()
		}
	}
}

async function getSuggestionTurnstileToken(): Promise<string | undefined> {
	if (!isTurnstileEnabled.value) {
		return undefined
	}

	turnstileToken.value = undefined
	await nextTick()
	turnstile.value?.reset()

	return await waitForTurnstileToken(turnstileToken)
}

async function waitForTurnstileToken(
	token: Ref<string | undefined>,
	timeoutMs = 12_000
): Promise<string> {
	const immediateToken = token.value?.trim()
	if (immediateToken) {
		return immediateToken
	}

	return await new Promise<string>((resolve, reject) => {
		const timeoutId = setTimeout(() => {
			stopWatcher()
			reject(new Error('Turnstile token timeout'))
		}, timeoutMs)

		const stopWatcher = watch(token, (nextToken) => {
			const normalizedToken = nextToken?.trim()
			if (!normalizedToken) {
				return
			}

			clearTimeout(timeoutId)
			stopWatcher()
			resolve(normalizedToken)
		})
	})
}
</script>

<template>
	<USlideover
		title="Doe een suggestie"
		description="Ontbreekt er iets in het menu? Hier kun je een suggestie doen om toe te voegen aan het overzicht."
		:ui="{ content: 'max-w-3xl' }"
	>
		<template #body>
			<NuxtTurnstile
				v-if="isTurnstileEnabled"
				ref="turnstile"
				v-model="turnstileToken"
				:options="{ action: 'suggestion_submission', appearance: 'interaction-only' }"
				class="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
			/>

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
					name="category"
					label="Categorie"
					description="In welke categorie valt dit onderdeel?"
				>
					<USelectMenu
						v-model="state.category"
						size="lg"
						value-key="value"
						label-key="label"
						:items="categoryOptions"
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
						:icon="getIcon('url')"
						placeholder="https://voorbeeld.nl"
					/>
				</UFormField>
				<UFormField
					name="email"
					label="E-mailadres"
					description="Je e-mailadres (optioneel). Handig voor als we aanvullende vragen hebben over je suggestie."
				>
					<UInput
						v-model="email"
						size="lg"
						type="email"
						:icon="getIcon('email')"
						placeholder="voorbeeld@domein.nl"
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
				label="Verstuur"
				type="submit"
				:loading="isSubmitting"
				:disabled="isSubmitting"
				color="success"
				variant="soft"
				:icon="getIcon('send')"
				@click="form?.submit()"
			/>
		</template>
	</USlideover>
</template>
