<script lang="ts" setup>
const route = useRoute()
const { data: page } = await useAsyncData(route.path, () => {
	return queryCollection('extras').path(route.path).first()
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
	title: `${page.value.title} | Extra's voor jouw site`,
	description: page.value.description,
	ogTitle: `${page.value.title} | Extra's voor jouw site`,
	ogDescription: page.value.description
})

const { data: surround } = await useAsyncData(`${route.path}-surround`, () => {
	return queryCollectionItemSurroundings('extras', route.path, {
		fields: ['description']
	})
})

const { getIcon } = useIcons()
</script>

<template>
	<NuxtLayout v-if="page" name="menu">
		<UPageHeader
			:title="page.title"
			headline="Extra's voor jouw site"
			:ui="{
				root: 'pt-2',
				wrapper: 'items-start lg:items-start'
			}"
		>
			<template #description>
				<p class="text-muted mt-4 text-lg text-pretty">{{ page.description }}</p>
			</template>
			<template #links>
				<PageHeaderLinks>
					<UFieldGroup v-if="page.download || page.link">
						<UButton
							v-if="page.link"
							:to="page.link"
							label="Naar website"
							target="_blank"
							variant="subtle"
							color="secondary"
							:icon="getIcon('url')"
						/>
						<UButton
							v-if="page.download"
							:to="page.download"
							label="Download"
							target="_blank"
							variant="subtle"
							color="secondary"
							:icon="getIcon('download')"
						/>
					</UFieldGroup>
				</PageHeaderLinks>
			</template>
		</UPageHeader>
		<ContentRenderer v-if="page" :value="page" />
		<div class="space-y-8 pt-16 pb-8">
			<USeparator label="Meer handige extra's" />
			<UContentSurround :surround="surround" />
		</div>
	</NuxtLayout>
</template>
