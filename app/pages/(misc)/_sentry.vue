<script lang="ts" setup>
import * as Sentry from '@sentry/nuxt'

defineRouteRules({
	robots: false
})

const title = 'Sentry testpagina'
const description = 'Gebruik deze pagina om client- en serverfouten naar Sentry te sturen.'
useSeoMeta({
	title,
	description,
	ogTitle: title,
	ogDescription: description
})

const toast = useToast()
const { getIcon } = useIcons()
const isTriggeringServerError = ref(false)

/**
 * Sends a controlled client-side exception to Sentry.
 *
 * @returns Nothing.
 */
function triggerClientError(): void {
	const error = new Error('Sentry test client error')
	const eventId = Sentry.captureException(error)

	toast.add({
		title: 'Clientfout verzonden',
		description: `Sentry event-id: ${eventId}`,
		color: 'success',
		icon: getIcon('success')
	})
}

/**
 * Triggers the server test endpoint inside a traced frontend span.
 *
 * @returns Nothing.
 */
async function triggerServerError(): Promise<void> {
	isTriggeringServerError.value = true

	try {
		await Sentry.startSpan(
			{
				name: 'Sentry test frontend span',
				op: 'test'
			},
			async () => {
				await $fetch('/api/_sentry/trigger-error')
			}
		)
	} catch (error) {
		console.error('Sentry test server request failed as expected', error)
		toast.add({
			title: 'Serverfout getriggerd',
			description: 'De testfout is uitgevoerd. Controleer Sentry Issues en Traces.',
			color: 'success',
			icon: getIcon('success')
		})
	} finally {
		isTriggeringServerError.value = false
	}
}
</script>

<template>
	<NuxtLayout name="menu">
		<UPageHero
			headline="Observability"
			title="Sentry testpagina"
			description="Gebruik deze pagina om te controleren of clientfouten, serverfouten en traces goed binnenkomen in Sentry."
			:ui="{ container: 'py-12 sm:py-16 lg:py-20' }"
		/>

		<UPageGrid class="grid-cols-1 pb-10 md:grid-cols-2 lg:grid-cols-2">
			<UPageCard
				title="Client error"
				description="Stuurt een test-exception vanaf de browser naar Sentry."
				:icon="getIcon('error')"
				:ui="{ description: 'text-base' }"
			>
				<template #footer>
					<UButton
						label="Trigger client error"
						color="error"
						variant="soft"
						:icon="getIcon('error')"
						@click="triggerClientError"
					/>
				</template>
			</UPageCard>

			<UPageCard
				title="Server error + trace"
				description="Start een frontend span en roept de endpoint `/api/_sentry/trigger-error` aan die bewust een fout gooit."
				:icon="getIcon('warn')"
				:ui="{ description: 'text-base' }"
			>
				<template #footer>
					<UButton
						label="Trigger server error"
						color="warning"
						variant="soft"
						:loading="isTriggeringServerError"
						:disabled="isTriggeringServerError"
						:icon="getIcon('warn')"
						@click="triggerServerError"
					/>
				</template>
			</UPageCard>
		</UPageGrid>
	</NuxtLayout>
</template>
