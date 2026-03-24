<script lang="ts" setup></script>

<template>
	<USlideover
		title="Rapportage"
		description="Hier vind je alle onderdelen terug die je hebt beoordeeld en kunt je een rapport genereren."
		:ui="{ content: 'max-w-3xl' }"
	>
		<UButton
			trailing-icon="lucide:file-badge"
			aria-label="Rapportage"
			color="neutral"
			variant="ghost"
		/>
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
