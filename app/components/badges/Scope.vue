<script lang="ts" setup>
import type { BadgeProps } from '@nuxt/ui'
import type { Scope } from '~~/shared/types/primitives'

import { getScopeHint } from '~/composables/content-taxonomy'

import HintPopover from './HintPopover.vue'

const props = withDefaults(defineProps<Omit<BadgeProps, 'label' | 'icon'> & { value: Scope }>(), {
	variant: 'subtle',
	color: 'neutral',
})

const { getIcon } = useIcons()

const hint = computed(() => getScopeHint(props.value))
</script>

<template>
	<HintPopover :hint="hint">
		<UBadge v-bind="$props" :label="value" :icon="getIcon('scope')" />
	</HintPopover>
</template>
