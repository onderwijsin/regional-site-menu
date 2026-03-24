<script lang="ts" setup>
const { openSuggestion } = useSuggestion()
</script>

<template>
	<UPageCTA
		title="Ontbreekt er iets?"
		description="Mis je een onderdeel op de menukaart? Heeft jouw website een toffe functie die we nog niet hebben? Laat het ons weten!"
		variant="subtle"
		class="my-16"
		:links="[
			{
				label: 'Doe een suggestie',
				trailingIcon: 'lucide:circle-fading-plus',
				color: 'primary',
				onClick: openSuggestion,
			},
		]"
	/>
</template>
