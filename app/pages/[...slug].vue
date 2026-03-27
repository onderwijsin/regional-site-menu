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
		fatal: true
	})
}

useSeoMeta({
	title: `${page.value.title} | ${page.value.pillar}`,
	description: page.value.description,
	ogTitle: `${page.value.title} | ${page.value.pillar}`,
	ogDescription: page.value.description
})

const { data: surround } = await useAsyncData(`${route.path}-surround`, () => {
	return queryCollectionItemSurroundings('items', route.path, {
		fields: ['description']
	})
})

const score = computed(() => state.getAuditScore(page.value!.id))
</script>

<template>
	<NuxtLayout v-if="page" name="menu">
		<UPageHeader
			:title="page.title"
			:headline="page.pillar"
			:ui="{
				root: 'pt-2',
				wrapper: 'items-start lg:items-start'
			}"
		>
			<template #description>
				<p class="text-muted my-4 text-lg text-pretty">{{ page.description }}</p>
				<div class="space-x-2">
					<Goal v-for="item in page.goals" :key="item" :value="item" />
					<Priority :value="page.priority" />
					<Scope :value="page.scope" />
					<ClientOnly>
						<Score v-if="state.mode === 'edit'" :value="score" />
					</ClientOnly>
				</div>
			</template>
			<template #links>
				<PageHeaderLinks>
					<ClientOnly>
						<AuditModal
							v-if="state.mode === 'edit'"
							:item-id="page.id"
							:item-title="page.title"
							:description="page.audit?.description"
						/>
					</ClientOnly>
				</PageHeaderLinks>
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
			<USeparator label="Ontdek meer elementen" />
			<UContentSurround :surround="surround" />
		</div>
	</NuxtLayout>
</template>
