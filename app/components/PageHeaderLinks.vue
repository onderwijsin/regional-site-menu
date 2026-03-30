<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

/**
 * Dependencies
 */
const route = useRoute()
const toast = useToast()
const { copy, copied } = useClipboard()
const origin = useRequestOrigin()
const appConfig = useAppConfig()
const { trackAiAction } = useTracking()
const { getIcon } = useIcons()

// ----------------------
// Computed
// ----------------------

/**
 * Absolute URL to the raw markdown version of the current page
 */
const mdPath = computed(() => `${origin}/raw${route.path}.md`)

/**
 * Prompt used for AI tools (ChatGPT / Claude)
 *
 * Gives context + directs model to full dataset
 */
const prompt = computed(() => {
	return `Lees dit item ${mdPath.value} zodat ik er vragen over kan stellen. 

Het item is afkomstig uit de tool "Menukaart voor regionale onderwijsloket websites". 
Deze tool biedt een overzicht van features, inhoud en andere functionailiteiten die een 
website van een regionaal onderwijsloket zou moeten /kunnen bevatten om hun doelgroep(en) 
te bedienen.

Meer informatie en content items kun je ontdekken via ${origin}/llms-full.txt
`
})

// ----------------------
// Actions
// ----------------------

/**
 * Fetch and copy full markdown content of the page
 */
async function copyPage(): Promise<void> {
	const content = await $fetch<string>(`/raw${route.path}.md`)
	copy(content)
}

// ----------------------
// Dropdown items
// ----------------------

/**
 * Actions available in the "copy / AI" dropdown
 */
const items = computed<DropdownMenuItem[]>(() => [
	{
		label: 'Kopieer Markdown',
		icon: getIcon('url'),
		onSelect() {
			copy(mdPath.value)

			trackAiAction({
				label: 'markdown',
				value: 'copy'
			})

			toast.add({
				title: 'Gekopieerd naar klembord',
				icon: getIcon('success')
			})
		}
	},
	{
		label: 'Bekijk als Markdown',
		icon: getIcon('markdown'),
		target: '_blank',
		to: `/raw${route.path}.md`,
		onSelect() {
			trackAiAction({
				label: 'markdown',
				value: 'view'
			})
		}
	},
	{
		label: 'Open in ChatGPT',
		icon: getIcon('chatgpt'),
		target: '_blank',
		to: `https://chatgpt.com/?hints=search&q=${encodeURIComponent(prompt.value)}`,
		onSelect() {
			trackAiAction({
				label: 'chatgpt',
				value: 'open_item'
			})
		}
	},
	{
		label: 'Open in Claude',
		icon: getIcon('claude'),
		target: '_blank',
		to: `https://claude.ai/new?q=${encodeURIComponent(prompt.value)}`,
		onSelect() {
			trackAiAction({
				label: 'claude',
				value: 'open_item'
			})
		}
	}
])
</script>

<template>
	<div class="flex gap-2">
		<slot />
		<UFieldGroup>
			<UButton
				label="Kopieer"
				:icon="copied ? getIcon('copied') : getIcon('copy')"
				color="neutral"
				variant="outline"
				:ui="{
					leadingIcon: [copied ? 'text-primary' : 'text-neutral', 'size-3.5']
				}"
				@click="copyPage"
			/>
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
				<UButton
					:icon="appConfig.ui.icons.chevronDown"
					size="sm"
					color="neutral"
					variant="outline"
					aria-label="Open kopieeracties menu"
				/>
			</UDropdownMenu>
		</UFieldGroup>
	</div>
</template>
