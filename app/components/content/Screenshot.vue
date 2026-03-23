<script setup lang="ts">
defineProps<{
	src: string
	caption?: string
}>()
</script>

<template>
	<div class="space-y-2">
		<NuxtImg :src="src" :alt="caption" width="720" class="max-w-full object-contain" />
		<p v-if="caption" class="text-dimmed text-sm italic">
			{{ caption }}
		</p>
	</div>
</template>
