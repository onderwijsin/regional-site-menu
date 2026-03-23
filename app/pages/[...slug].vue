<script lang="ts" setup>
const route = useRoute()
const { data: page } = await useAsyncData(route.path, () => {
	return queryCollection('items').path(route.path).first()
})

if (!page.value) {
	// Handle page not found
	throw createError({
		statusCode: 404,
		statusMessage: 'Item niet gevonden',
		fatal: true,
	})
}

const { data: surround } = await useAsyncData(`${route.path}-surround`, () => {
	return queryCollectionItemSurroundings('items', route.path, {
		fields: ['description'],
	})
})
</script>

<template>
	<NuxtLayout name="menu">
		<ContentRenderer v-if="page" :value="page" />
		<div class="space-y-8 pt-16 pb-8">
			<UContentSurround :surround="surround as any" />
			<UPageCTA
				title="Heb je vragen of opmerkingen?"
				description="Laat het ons weten via het contactformulier. We reageren zo snel mogelijk."
				variant="subtle"
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
		</div>
	</NuxtLayout>
</template>
