<script setup>
useHead({
	meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
	link: [{ rel: 'icon', href: '/favicon.ico' }],
	htmlAttrs: {
		lang: 'nl',
	},
})

const title = 'Regiosite Menukaart'
const description =
	'Ontwerp, evalueer en verbeter regiosites voor onderwijs met een flexibele menukaart van onderdelen. Stel eenvoudig een concrete briefing samen voor verdere ontwikkeling.'

useSeoMeta({
	title,
	description,
	ogTitle: title,
	ogDescription: description,
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
		<UHeader :toggle="false">
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

						<UTooltip text="Bekijk je winkelmandje">
							<UButton
								v-if="mode === 'edit'"
								icon="lucide:shopping-cart"
								aria-label="Winkelmandje"
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

		<UFooter>
			<template #left>
				<p class="text-muted text-sm">
					Onderwijsregio's • © {{ new Date().getFullYear() }}
				</p>
			</template>

			<template #right>
				<UButton aria-label="Onderwijsregio" v-bind="externalSite" />
			</template>
		</UFooter>
		<div class="bg-default fixed inset-0 z-50 md:hidden">
			<UContainer class="h-full">
				<UEmpty
					icon="lucide:message-circle-warning"
					title="Niet beschikbaar"
					description="Deze app is momenteel alleen beschikbaar op grotere schermen."
					variant="naked"
					class="h-full"
				/>
			</UContainer>
		</div>
	</UApp>
</template>
