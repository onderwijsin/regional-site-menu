<script lang="ts" setup>
import type { ItemsCollectionItem } from '@nuxt/content'
import type { BadgeProps } from '@nuxt/ui'

const props = withDefaults(
	defineProps<Omit<BadgeProps, 'label' | 'icon'> & { value: ItemsCollectionItem['priority'] }>(),
	{
		variant: 'subtle',
		color: 'neutral',
	},
)

const { getIcon } = useIcons()

const hint = computed(() => {
	if (props.value === 'Must have') {
		return 'Dit element is essentieel voor de gebruiker.'
	}

	if (props.value === 'Should have') {
		return 'Dit element is in de meeste gevallen belangrijk voor de gebruiker.'
	}

	if (props.value === 'Nice to have') {
		return 'Dit element is optioneel, maar kan de gebruikerservaring verbeteren.'
	}

	return 'Geeft aan hoe belangrijk dit element is voor de gebruiker.'
})
</script>

<template>
	<UPopover mode="hover" :ui="{ content: 'max-w-sm px-3 py-2' }">
		<UBadge v-bind="$props" :label="value" :icon="getIcon('priority')" />
		<template #content>
			<p class="text-muted text-xs leading-relaxed">{{ hint }}</p>
		</template>
	</UPopover>
</template>
