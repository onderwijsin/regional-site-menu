<script lang="ts" setup>
const { getIcon } = useIcons()
</script>

<template>
	<UContainer class="grid h-[calc(100vh-calc(2*var(--ui-header-height)))]">
		<UEmpty
			:icon="getIcon('screensize')"
			title="Niet beschikbaar"
			description="Deze app is momenteel alleen beschikbaar op grotere schermen."
			variant="naked"
			class="h-full"
		/>
	</UContainer>
</template>
