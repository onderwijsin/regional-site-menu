<script lang="ts" setup>
import type { ItemsCollectionItem } from '@nuxt/content'
import type { BadgeProps } from '@nuxt/ui'

import { getPriorityHint } from '~/composables/content-taxonomy'

import HintPopover from './HintPopover.vue'

const props = withDefaults(
	defineProps<Omit<BadgeProps, 'label' | 'icon'> & { value: ItemsCollectionItem['priority'] }>(),
	{
		variant: 'subtle',
		color: 'neutral',
	},
)

const { getIcon } = useIcons()

const hint = computed(() => getPriorityHint(props.value))
</script>

<template>
	<HintPopover :hint="hint">
		<UBadge v-bind="$props" :label="value" :icon="getIcon('priority')" />
	</HintPopover>
</template>
