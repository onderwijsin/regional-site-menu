<script lang="ts" setup>
import type { TabsItem } from '@nuxt/ui'

const state = useStateStore()

const tabs: TabsItem[] = [
	{ label: 'Alle doelen', value: 'all' },
	{ label: 'Enthousiasmeren', value: 'enthusiasm' },
	{ label: 'Informeren', value: 'inform' },
	{ label: 'Activeren', value: 'engage' },
]
</script>

<template>
	<NuxtLayout name="explorer">
		<div class="space-y-8 pt-8">
			<div class="flex items-center justify-between gap-6">
				<UInput
					size="lg"
					variant="outline"
					placeholder="Doorzoek het menu"
					icon="lucide:search"
					class="grow"
				/>
				<UTabs
					v-model="state.filter"
					:items="tabs"
					color="secondary"
					:ui="{ root: 'gap-0', label: 'font-bold', trigger: 'cursor-pointer' }"
					size="sm"
				/>
			</div>
			<UPageColumns>
				<UPageCard
					v-for="i in 20"
					:key="i"
					variant="solid"
					to="https://cloudflare.com"
					icon="i-logos-cloudflare-icon"
					title="Cloudflare's Workers LaunchPad"
					description="NuxtHub is part of the Cloudflare's Workers Launchpad Cohort to make sure you get a first-class experience on top of Cloudflare's network."
					:ui="{ leadingIcon: 'size-10' }"
				/>
			</UPageColumns>
		</div>

		<UPageCTA
			title="Heb je vragen of opmerkingen?"
			description="Laat het ons weten via het contactformulier. We reageren zo snel mogelijk."
			variant="subtle"
			class="my-16"
			:links="[
				{
					label: 'Stuur een bericht',
					to: 'https://www.onderwijsregio.nl/service/contact',
					target: '_blank',
					trailingIcon: 'i-lucide-arrow-right',
					color: 'primary',
				},
			]"
		/>
	</NuxtLayout>
</template>
