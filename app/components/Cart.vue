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
		<template #body> TODO: lijst met stuff </template>
		<template #footer> TODO: checkout </template>
	</USlideover>
</template>
