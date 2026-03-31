<script lang="ts" setup>
const route = useRoute()
const { data: page } = await useAsyncData(route.path, () => {
	return queryCollection('faqs').path(route.path).first()
})

if (!page.value) {
	// Handle page not found
	throw createError({
		statusCode: 404,
		statusMessage: 'Item niet gevonden',
		fatal: true
	})
}
const { data: surround } = await useAsyncData(`${route.path}-surround`, () => {
	return queryCollectionItemSurroundings('faqs', route.path, {
		fields: ['description']
	})
})
</script>

<template>
	<NuxtLayout v-if="page" name="menu">
		<UPageHeader
			:title="page.title"
			headline="FAQs"
			:ui="{
				root: 'pt-2',
				wrapper: 'items-start lg:items-start'
			}"
		>
			<template #description>
				<p class="text-muted mt-4 text-lg text-pretty">{{ page.description }}</p>
			</template>
		</UPageHeader>
		<div class="space-y-8 pt-16 pb-8">
			<UContentSurround :surround="surround" />
		</div>
	</NuxtLayout>
</template>
