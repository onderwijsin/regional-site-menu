<script lang="ts" setup>
defineProps<{
	hint: string
}>()
</script>

<template>
	<UPopover mode="hover" :ui="{ content: 'max-w-sm px-3 py-2' }">
		<slot />
		<template #content>
			<p class="text-muted text-xs leading-relaxed">{{ hint }}</p>
		</template>
	</UPopover>
</template>
