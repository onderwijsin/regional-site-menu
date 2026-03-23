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

// Always navigate to the explorer if the tab is changed and current route is landing
const route = useRoute()
watch(mode, async () => {
	if (route.path === '/') await navigateTo('/explorer')
})

const { externalSite } = useMenu()

const { openSuggestion } = useSuggestion()
const { openCart } = useCart()
</script>

<template>
	<UApp>
		<UHeader :ui="{ right: 'flex items-center gap-4' }">
			<template #left>
				<NuxtLink to="/" class="flex items-center gap-2">
					<NuxtImg src="logo.png" width="40" alt="Onderwijsregio's logo" />
					<span class="text-lg font-bold">Onderwijsregio's</span>
				</NuxtLink>
			</template>

			<template #right>
				<UButton
					v-if="mode === 'edit'"
					icon="lucide:circle-fading-plus"
					aria-label="Doe een suggestie"
					color="neutral"
					variant="ghost"
					@click="openSuggestion"
				/>

				<UButton
					v-if="mode === 'edit'"
					trailing-icon="lucide:shopping-cart"
					aria-label="Winkelmandje"
					color="neutral"
					variant="ghost"
					@click="openCart"
				/>
				<UColorModeButton />
				<ViewMode />
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
	</UApp>
</template>
