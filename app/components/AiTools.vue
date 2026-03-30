<script setup lang="ts">
import type { ButtonProps, DropdownMenuItem } from '@nuxt/ui'

withDefaults(defineProps<Omit<ButtonProps, 'icon' | 'aria-label'>>(), {
	variant: 'ghost',
	color: 'neutral'
})
const origin = useRequestOrigin()
const { trackAiAction } = useTracking()
const { getIcon } = useIcons()

const prompt = computed(
	() => `Lees deze documentatie ${origin}/llms-full.txt zodat we erover kunnen sparren. 

Het document bevat de volledige lijst items uit de tool "Menukaart voor regionale onderwijsloket 
websites". Deze tool biedt een overzicht van features, inhoud en andere functionailiteiten die een 
website van een regionaal onderwijsloket zou moeten /kunnen bevatten om hun doelgroep(en) te bedienen.
`
)

const items: DropdownMenuItem[] = [
	{
		label: 'Sparren met ChatGPT',
		icon: getIcon('chatgpt'),
		target: '_blank',
		to: `https://chatgpt.com/?hints=search&q=${encodeURIComponent(prompt.value)}`,
		onSelect: () => {
			trackAiAction({
				label: 'chatgpt',
				value: 'sparren'
			})
		}
	},
	{
		label: 'Sparren met Claude',
		icon: getIcon('claude'),
		target: '_blank',
		to: `https://claude.ai/new?q=${encodeURIComponent(prompt.value)}`,
		onSelect: () => {
			trackAiAction({
				label: 'claude',
				value: 'sparren'
			})
		}
	}
]
</script>

<template>
	<UDropdownMenu
		:items="items"
		:content="{
			align: 'end',
			side: 'bottom',
			sideOffset: 8
		}"
		:ui="{
			content: 'w-48'
		}"
	>
		<UTooltip text="Spar over deze tool met AI">
			<UButton :icon="getIcon('ai')" aria-label="Open AI menu" v-bind="$props" />
		</UTooltip>
	</UDropdownMenu>
</template>
