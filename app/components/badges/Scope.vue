<script lang="ts" setup>
import type { ItemsCollectionItem } from '@nuxt/content'
import type { BadgeProps } from '@nuxt/ui'

const props = withDefaults(
	defineProps<Omit<BadgeProps, 'label' | 'icon'> & { value: ItemsCollectionItem['scope'] }>(),
	{
		variant: 'subtle',
		color: 'neutral',
	},
)

const { getIcon } = useIcons()

const hint = computed(() => {
	if (props.value === 'Regionaal') {
		return 'Deze informatie is alleen relevant binnen jouw onderwijsregio.'
	}

	if (props.value === 'Bovenregionaal') {
		return "Jouw informatie-aanbod is relevant binnen jouw regio én nabijgelegen onderwijsregio's."
	}

	if (props.value === 'Landelijk') {
		return "Jouw informatie-aanbod is relevant voor álle onderwijsregio's in Nederland."
	}

	return 'Geeft aan binnen welke geografische scope deze informatie relevant is.'
})
</script>

<template>
	<UPopover mode="hover" :ui="{ content: 'max-w-sm px-3 py-2' }">
		<UBadge v-bind="$props" :label="value" :icon="getIcon('scope')" />
		<template #content>
			<p class="text-muted text-xs leading-relaxed">{{ hint }}</p>
		</template>
	</UPopover>
</template>
