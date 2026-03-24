<script lang="ts" setup>
const props = defineProps<{
	itemId: string
	itemTitle: string
	description?: string
}>()

const description = computed(() => {
	if (props.description) {
		return props.description
	}
	return `Hoe scoort jouw website op het onderdeel "${props.itemTitle}"?`
})

const { getAuditScore, setAuditScore } = useStateStore()
const value = computed({
	get: () => getAuditScore(props.itemId),
	set: (newValue: number) => setAuditScore(props.itemId, newValue),
})

const currentColor = computed(() => {
	if (value.value === undefined) {
		return 'neutral'
	}
	if (value.value >= 8) {
		return 'success'
	}
	if (value.value >= 5) {
		return 'warning'
	}
	return 'error'
})

const tooltip = computed(() => {
	switch (value.value) {
		case 1:
			return 'Zeer slecht (1/10)'
		case 2:
			return 'Zeer slecht (2/10)'
		case 3:
			return 'Slecht (3/10)'
		case 4:
			return 'Slecht (4/10)'
		case 5:
			return 'Matig (5/10)'
		case 6:
			return 'Voldoende (6/10)'
		case 7:
			return 'Goed (7/10)'
		case 8:
			return 'Zeer goed (8/10)'
		case 9:
			return 'Uitstekend (9/10)'
		case 10:
			return 'Perfect (10/10)'
		default:
			return 'Nog geen score'
	}
})
</script>

<template>
	<UPageCTA
		title="Hoe doet jouw website het?"
		:description="description"
		variant="subtle"
		class="my-16"
		:ui="{ links: 'max-w-lg mx-auto' }"
	>
		<template #links>
			<USlider
				v-model="value"
				:min="1"
				:max="10"
				:default-value="5"
				:color="currentColor"
				:tooltip="{ text: tooltip }"
			/>
		</template>
	</UPageCTA>
</template>
