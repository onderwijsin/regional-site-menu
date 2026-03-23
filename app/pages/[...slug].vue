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
	<NuxtLayout v-if="page" name="menu">
		<UPageHeader
			:title="page.title"
			:headline="page.pillar"
			:ui="{
				root: 'pt-2',
			}"
		>
			<template #description>
				<p class="text-muted my-4 text-lg text-pretty">{{ page.description }}</p>
				<div class="space-x-2">
					<UBadge
						v-for="item in page.goals"
						:key="item"
						:label="item"
						icon="lucide:goal"
						variant="subtle"
						color="secondary"
					/>
					<UBadge
						:label="page.priority"
						icon="heroicons:fire-16-solid"
						variant="subtle"
						color="neutral"
					/>
					<UBadge
						:label="page.scope"
						icon="lucide:square-dashed-mouse-pointer"
						variant="subtle"
						color="neutral"
					/>
				</div>
			</template>
			<template #links>
				<PageHeaderLinks />
			</template>
		</UPageHeader>
		<ContentRenderer v-if="page" :value="page" />
		<div class="space-y-8 pt-16 pb-8">
			<USeparator label="Verder lezen" />
			<UContentSurround :surround="surround" />
		</div>
	</NuxtLayout>
</template>
