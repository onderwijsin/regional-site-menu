<script lang="ts" setup>
import type { ItemsCollectionItem } from '@nuxt/content'
import type { BadgeProps } from '@nuxt/ui'

const props = withDefaults(
	defineProps<Omit<BadgeProps, 'label'> & { value: ItemsCollectionItem['goals'][number] }>(),
	{
		variant: 'subtle',
		icon: 'lucide:goal',
		color: 'secondary',
	},
)

const hint = computed(() => {
	if (props.value === 'Informeren') {
		return 'Je wilt de potentiële onderwijsprofessional informeren over de mogelijkheden in het onderwijs, en specifiek binnen jouw regio.'
	}

	if (props.value === 'Activeren') {
		return 'Je wilt de potentiële onderwijsprofessional activeren om een concrete vervolgstap te zetten in zijn klantreis.'
	}

	if (props.value === 'Enthousiasmeren') {
		return 'Je wilt de potentiële onderwijsprofessional enthousiasmeren en verleiden om te kiezen voor een baan in het onderwijs.'
	}

	return 'Eén van de doelen van de website van jouw regionale onderwijsloket'
})
</script>

<template>
	<UPopover mode="hover" :ui="{ content: 'max-w-sm px-3 py-2' }">
		<UBadge v-bind="$props" :label="value" />
		<template #content>
			<p class="text-muted text-xs leading-relaxed">{{ hint }}</p>
		</template>
	</UPopover>
</template>
