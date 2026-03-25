<script lang="ts" setup>
import { siteDescription, siteTitle } from '~~/config/indentity'

useSeoMeta({
	title: siteTitle,
	description: siteDescription,
	ogTitle: siteTitle,
	ogDescription: siteDescription,
})
</script>

<template>
	<NuxtLayout name="menu">
		<ClientOnly>
			<MenuOverview persist />
			<SuggestionCta />
			<template #fallback>
				<SkeletonMenu />
			</template>
		</ClientOnly>
	</NuxtLayout>
</template>
