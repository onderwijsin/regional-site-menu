<script lang="ts" setup>
const { openSuggestion } = useSuggestion()
const { getIcon } = useIcons()
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
				trailingIcon: getIcon('suggestion'),
				color: 'primary',
				onClick: openSuggestion
			}
		]"
	/>
</template>
