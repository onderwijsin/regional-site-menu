<script lang="ts" setup>
withDefaults(
	defineProps<{
		/**
		 * Spacing class applied to the async content root.
		 */
		contentClass?: string
	}>(),
	{
		contentClass: 'space-y-12'
	}
)
</script>

<template>
	<ClientOnly>
		<Suspense>
			<template #default>
				<div :class="contentClass">
					<slot />
				</div>
			</template>
			<template #fallback>
				<SkeletonMenu />
			</template>
		</Suspense>
		<template #fallback>
			<SkeletonMenu />
		</template>
	</ClientOnly>
</template>
