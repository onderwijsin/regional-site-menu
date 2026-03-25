<script setup lang="ts">
const title = 'Hulp bij de tool'
const description = 'Ontdek de verschillende functies en mogelijkheden van de tool.'
useSeoMeta({
	title,
	description,
	ogTitle: title,
	ogDescription: description,
})
</script>

<template>
	<UContainer class="pt-16">
		<UEmpty
			icon="lucide:sparkles"
			title="Nog in ontwikkeling"
			description="Deze feature is nog niet uitontwikkeld. Probeer het later nog eens."
			variant="soft"
		/>

		<ContactCta />
	</UContainer>
</template>
