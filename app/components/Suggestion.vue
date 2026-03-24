<script lang="ts" setup></script>

<template>
	<USlideover
		title="Doe een suggestie"
		description="Ontbreekt er iets in het menu? Hier kun je een suggestie doen om toe te voegen aan het overzicht."
		:ui="{ content: 'max-w-3xl' }"
	>
		<template #body>
			<UEmpty
				icon="lucide:sparkles"
				title="Nog in ontwikkeling"
				description="Aan deze feature wordt nog hard gewerkt! Probeer het later nog een keer"
			/>
		</template>
		<template #footer></template>
	</USlideover>
</template>
