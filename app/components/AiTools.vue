<script setup lang="ts">
import type { ButtonProps } from '@nuxt/ui'

withDefaults(defineProps<Omit<ButtonProps, 'icon' | 'aria-label'>>(), {
	variant: 'ghost',
	color: 'neutral',
})
const site = useSiteConfig()

const prompt = computed(
	() => `Lees deze documentatie ${site.url}/llms-full.txt zodat we erover kunnen sparren. 

Het document bevat de volledige lijst items uit de tool "Menukaart voor regionale onderwijsloket 
websites". Deze tool biedt een overzicht van features, inhoud en andere functionailiteiten die een 
website van een regionaal onderwijsloket zou moeten /kunnen bevatten om hun doelgroep(en) te bedienen.
`,
)

const items = [
	{
		label: 'Sparren met ChatGPT',
		icon: 'i-simple-icons:openai',
		target: '_blank',
		to: `https://chatgpt.com/?hints=search&q=${encodeURIComponent(prompt.value)}`,
	},
	{
		label: 'Sparren met Claude',
		icon: 'i-simple-icons:anthropic',
		target: '_blank',
		to: `https://claude.ai/new?q=${encodeURIComponent(prompt.value)}`,
	},
]
</script>

<template>
	<UDropdownMenu
		:items="items"
		:content="{
			align: 'end',
			side: 'bottom',
			sideOffset: 8,
		}"
		:ui="{
			content: 'w-48',
		}"
	>
		<UTooltip text="Spar over deze tool met AI">
			<UButton
				icon="hugeicons:artificial-intelligence-04"
				aria-label="Open AI menu"
				v-bind="$props"
			/>
		</UTooltip>
	</UDropdownMenu>
</template>
