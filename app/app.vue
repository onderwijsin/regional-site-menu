<script setup>
import { siteDescription, siteTitle } from '~~/config/indentity'

useSeoMeta({
	title: siteTitle,
	description: siteDescription,
	ogTitle: siteTitle,
	ogDescription: siteDescription,
	ogImage: '/ogimage.png',
	twitterImage: '/ogimage.png',
	twitterCard: 'summary_large_image',
})

const { mode } = storeToRefs(useStateStore())
const { externalSite } = useMenu()

const { openSuggestion } = useSuggestion()
const { openCart } = useCart()
</script>

<template>
	<UApp>
		<UHeader :toggle="false" :ui="{ right: 'hidden md:flex' }">
			<template #left>
				<NuxtLink to="/" class="flex items-center gap-2">
					<NuxtImg src="logo.png" width="40" alt="Onderwijsregio's logo" />
					<span class="text-lg font-bold">Onderwijsregio's</span>
				</NuxtLink>
			</template>

			<template #right>
				<ClientOnly>
					<div class="flex items-center gap-4">
						<UTooltip text="Doe een suggestie">
							<UButton
								v-if="mode === 'edit'"
								icon="lucide:circle-fading-plus"
								aria-label="Doe een suggestie"
								color="neutral"
								variant="ghost"
								@click="openSuggestion"
							/>
						</UTooltip>

						<UTooltip text="Bekijk je beoordelingen">
							<UButton
								v-if="mode === 'edit'"
								icon="lucide:file-badge"
								aria-label="Rapportage"
								color="neutral"
								variant="ghost"
								@click="openCart"
							/>
						</UTooltip>

						<AiTools />
						<UColorModeButton />
						<ViewMode />
					</div>
				</ClientOnly>
			</template>
		</UHeader>

		<UMain>
			<NuxtPage />
		</UMain>

		<USeparator
			:avatar="{
				src: '/logo.png',
				loading: 'lazy',
			}"
		/>

		<UFooter class="mb-2">
			<template #left>
				<p class="text-muted text-sm">
					Onderwijsregio's • © {{ new Date().getFullYear() }}
				</p>
			</template>

			<template #right>
				<UButton aria-label="Onderwijsregio" v-bind="externalSite" />
			</template>
		</UFooter>
	</UApp>
</template>
