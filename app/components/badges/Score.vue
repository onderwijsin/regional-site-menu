<script lang="ts" setup>
import type { BadgeProps } from '@nuxt/ui'

const props = withDefaults(
	defineProps<Omit<BadgeProps, 'label' | 'color'> & { value: number | undefined }>(),
	{
		variant: 'subtle',
	},
)

const { getIcon } = useIcons()
const icon = computed(() => props.icon ?? getIcon('report'))

const { getScoreColor, getScoreLabel } = useAuditUtils()

const hint = computed(() => {
	if (props.value === undefined) {
		return 'Je hebt je website nog niet beoordeeld op dit onderdeel'
	}
	return `Je hebt je website beoordeeld met een score van ${props.value} / 10`
})
</script>

<template>
	<UPopover mode="hover" :ui="{ content: 'max-w-sm px-3 py-2' }">
		<UBadge
			v-bind="$props"
			:label="getScoreLabel(value)"
			:color="getScoreColor(value)"
			:icon="icon"
			class="font-bold"
		/>
		<template #content>
			<p class="text-muted text-xs leading-relaxed">
				{{ hint }}
			</p>
		</template>
	</UPopover>
</template>
