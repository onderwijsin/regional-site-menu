<script lang="ts" setup>
import type { ItemsCollectionItem } from '@nuxt/content'
import type { BadgeProps } from '@nuxt/ui'

const props = withDefaults(
	defineProps<Omit<BadgeProps, 'label' | 'icon'> & { value: ItemsCollectionItem['pillar'] }>(),
	{
		variant: 'subtle',
		color: 'primary',
	},
)

const hint = computed(() => {
	if (props.value === 'Inzicht & Overzicht') {
		return 'Je biedt je gebruikers inzicht in wat jouw regio wél en niet te bieden heeft.'
	}

	if (props.value === 'Verdieping & Ervaring') {
		return "Je biedt je gebruikers inhoudelijke verdieping op de thema's waar jullie je mee bezig houden"
	}

	if (props.value === 'Activatie & Deelname') {
		return 'Je biedt je gebruikers mogelijkheden concrete acties te ondernemen en deel te nemen aan activiteiten.'
	}

	if (props.value === 'Ondersteuning & Contact') {
		return 'Je biedt je gebruikers ondersteuning in hun klantreis en mogelijkheden om persoonlijk contact te leggen.'
	}

	return 'Eén van de content categorieën van de website van jouw regionale onderwijsloket'
})

const { getIcon } = useIcons()

const icon = computed(() => {
	if (props.value === 'Inzicht & Overzicht') {
		return getIcon('inzicht')
	}

	if (props.value === 'Verdieping & Ervaring') {
		return getIcon('verdieping')
	}

	if (props.value === 'Activatie & Deelname') {
		return getIcon('activatie')
	}

	if (props.value === 'Ondersteuning & Contact') {
		return getIcon('ondersteuning')
	}

	return undefined
})
</script>

<template>
	<UPopover mode="hover" :ui="{ content: 'max-w-sm px-3 py-2' }">
		<UBadge v-bind="$props" :label="value" :icon="icon" />
		<template #content>
			<p class="text-muted text-xs leading-relaxed">{{ hint }}</p>
		</template>
	</UPopover>
</template>
