<script lang="ts" setup></script>

<template>
	<USlideover
		title="Jouw winkelmandje"
		description="In je winkelmandje vind je alle onderdelen terug waar je mee aan de slag bent geweest."
		:ui="{ content: 'max-w-3xl' }"
	>
		<UButton
			trailing-icon="lucide:shopping-cart"
			aria-label="Winkelmandje"
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
