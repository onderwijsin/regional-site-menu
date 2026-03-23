<script setup lang="ts">
const route = useRoute()
const toast = useToast()
const { copy, copied } = useClipboard()
const site = useSiteConfig()
const appConfig = useAppConfig()

const mdPath = computed(() => `${site.url}/raw${route.path}.md`)

const prompt = computed(
	() => `Lees dit item ${mdPath.value} zodat ik er vragen over kan stellen. 

Het item is afkomstig uit de tool "Menukaart voor regionale onderwijsloket websites". 
Deze tool biedt een overzicht van features, inhoud en andere functionailiteiten die een 
website van een regionaal onderwijsloket zou moeten /kunnen bevatten om hun doelgroep(en) 
te bedienen.

Meer informatie en content items kun je ontdekken via ${site.url}/llms-full.txt
`,
)

const items = [
	{
		label: 'Kopieer Markdown',
		icon: 'i-lucide-link',
		onSelect() {
			copy(mdPath.value)
			toast.add({
				title: 'Gekopieerd naar klembord',
				icon: 'i-lucide-check-circle',
			})
		},
	},
	{
		label: 'Bekijk als Markdown',
		icon: 'i-simple-icons:markdown',
		target: '_blank',
		to: `/raw${route.path}.md`,
	},
	{
		label: 'Open in ChatGPT',
		icon: 'i-simple-icons:openai',
		target: '_blank',
		to: `https://chatgpt.com/?hints=search&q=${encodeURIComponent(prompt.value)}`,
	},
	{
		label: 'Open in Claude',
		icon: 'i-simple-icons:anthropic',
		target: '_blank',
		to: `https://claude.ai/new?q=${encodeURIComponent(prompt.value)}`,
	},
]

async function copyPage() {
	copy(await $fetch<string>(`/raw${route.path}.md`))
}
</script>

<template>
	<UFieldGroup>
		<UButton
			label="Kopieer pagina"
			:icon="copied ? appConfig.ui.icons.copyCheck : appConfig.ui.icons.copy"
			color="neutral"
			variant="outline"
			:ui="{
				leadingIcon: [copied ? 'text-primary' : 'text-neutral', 'size-3.5'],
			}"
			@click="copyPage"
		/>
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
			<UButton
				:icon="appConfig.ui.icons.chevronDown"
				size="sm"
				color="neutral"
				variant="outline"
				aria-label="Open kopieeracties menu"
			/>
		</UDropdownMenu>
	</UFieldGroup>
</template>
