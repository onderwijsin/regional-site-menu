<script lang="ts" setup>
import type { ItemsCollectionItem } from '@nuxt/content'
import type { BadgeProps } from '@nuxt/ui'

import { getPillarHint, getPillarIconName } from '~/composables/content-taxonomy'

import HintPopover from './HintPopover.vue'

const props = withDefaults(
	defineProps<Omit<BadgeProps, 'label' | 'icon'> & { value: ItemsCollectionItem['pillar'] }>(),
	{
		variant: 'subtle',
		color: 'primary',
	},
)

const hint = computed(() => getPillarHint(props.value))

const { getIcon } = useIcons()
const icon = computed(() => getIcon(getPillarIconName(props.value)))
</script>

<template>
	<HintPopover :hint="hint">
		<UBadge v-bind="$props" :label="value" :icon="icon" />
	</HintPopover>
</template>
