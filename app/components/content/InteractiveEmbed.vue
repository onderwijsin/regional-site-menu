<script setup lang="ts">
defineProps<{
	src: string
	caption?: string
}>()
</script>

<template>
	<div class="w-full space-y-2">
		<div class="border-muted bg-elevated relative w-full overflow-hidden rounded-xl border">
			<div class="aspect-video w-full">
				<iframe
					v-if="src"
					:src="src"
					class="h-full w-full border-0"
					loading="lazy"
					referrerpolicy="no-referrer"
					sandbox="allow-scripts allow-same-origin allow-popups"
				/>

				<UEmpty
					v-else
					class="text-muted flex h-full items-center justify-center text-sm"
					icon="lucide:message-square-warning"
					title="Ongeldige embed URL"
					description="De opgegeven URL kan niet geëmbed worden."
				/>

				<UButton
					v-if="src"
					variant="subtle"
					size="sm"
					color="secondary"
					:to="src"
					class="absolute right-2 bottom-2"
					label="open in tabblad"
					trailing-icon="lucide:arrow-up-right"
				/>
			</div>
		</div>

		<p v-if="caption" class="text-dimmed text-sm italic">
			{{ caption }}
		</p>
	</div>
</template>
