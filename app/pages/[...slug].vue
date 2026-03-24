<script lang="ts" setup>
const state = useStateStore()
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
				wrapper: 'items-start lg:items-start',
			}"
		>
			<template #description>
				<p class="text-muted my-4 text-lg text-pretty">{{ page.description }}</p>
				<div class="space-x-2">
					<Goal v-for="item in page.goals" :key="item" :value="item" />
					<Priority :value="page.priority" />
					<Scope :value="page.scope" />
				</div>
			</template>
			<template #links>
				<PageHeaderLinks
					:item-id="page.id"
					:item-title="page.title"
					:description="page.audit?.description"
				/>
			</template>
		</UPageHeader>
		<ContentRenderer v-if="page" :value="page" />
		<ClientOnly>
			<AuditBanner
				v-if="state.mode === 'edit'"
				:item-id="page.id"
				:item-title="page.title"
				:description="page.audit?.description"
			/>
		</ClientOnly>
		<div class="space-y-8 pt-16 pb-8">
			<USeparator label="Verder lezen" />
			<UContentSurround :surround="surround" />
		</div>
	</NuxtLayout>
</template>
