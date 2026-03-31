<script lang="ts" setup>
import { siteDescription, siteTitle } from '~~/config/identity'

useSeoMeta({
	title: siteTitle,
	description: siteDescription,
	ogTitle: siteTitle,
	ogDescription: siteDescription
})
</script>

<template>
	<NuxtLayout name="menu">
		<AsyncMenuBoundary>
			<MenuOverview persist />
			<SuggestionCta />
		</AsyncMenuBoundary>
	</NuxtLayout>
</template>
