<script lang="ts" setup>
import type { BadgeProps } from '@nuxt/ui'
import type { Goal } from '~~/shared/types/primitives'

import { getGoalHint } from '~/composables/content-taxonomy'

import HintPopover from './HintPopover.vue'

const props = withDefaults(defineProps<Omit<BadgeProps, 'label'> & { value: Goal }>(), {
	variant: 'subtle',
	color: 'secondary'
})

const { getIcon } = useIcons()
const icon = computed(() => props.icon ?? getIcon('goal'))

const hint = computed(() => getGoalHint(props.value))
</script>

<template>
	<HintPopover :hint="hint">
		<UBadge v-bind="$props" :label="value" :icon="icon" />
	</HintPopover>
</template>
