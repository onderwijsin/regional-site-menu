<script lang="ts" setup>
import type { EditorSuggestionMenuItem, EditorToolbarItem } from '@nuxt/ui'

import EditorLinkPopover from './EditorLinkPopover.vue'

defineProps<{ autofocus?: boolean; outline?: boolean }>()
const model = defineModel<string>()

const suggestions: EditorSuggestionMenuItem[][] = [
	[
		{
			type: 'label',
			label: 'Tekst',
		},
		{
			kind: 'paragraph',
			label: 'Paragraaf',
			icon: 'i-lucide-type',
		},
		{
			kind: 'heading',
			level: 1,
			label: 'Kop 1',
			icon: 'i-lucide-heading-1',
		},
		{
			kind: 'heading',
			level: 2,
			label: 'Kop 2',
			icon: 'i-lucide-heading-2',
		},
		{
			kind: 'heading',
			level: 3,
			label: 'Kop 3',
			icon: 'i-lucide-heading-3',
		},
	],
	[
		{
			type: 'label',
			label: 'Lijsten',
		},
		{
			kind: 'bulletList',
			label: 'Opsomming',
			icon: 'i-lucide-list',
		},
		{
			kind: 'orderedList',
			label: 'Genummerde lijst',
			icon: 'i-lucide-list-ordered',
		},
	],
	[
		{
			type: 'label',
			label: 'Invoegen',
		},
		{
			kind: 'blockquote',
			label: 'Citaat',
			icon: 'i-lucide-text-quote',
		},
		{
			kind: 'horizontalRule',
			label: 'Scheidingslijn',
			icon: 'i-lucide-separator-horizontal',
		},
	],
]

const tools: EditorToolbarItem[][] = [
	[
		{
			kind: 'undo',
			icon: 'i-lucide-undo',
			tooltip: { text: 'Ongedaan maken' },
		},
		{
			kind: 'redo',
			icon: 'i-lucide-redo',
			tooltip: { text: 'Opnieuw' },
		},
	],
	[
		{
			icon: 'i-lucide-heading',
			tooltip: { text: 'Headings' },
			content: {
				align: 'start',
			},
			items: [
				{
					kind: 'heading',
					level: 1,
					icon: 'i-lucide-heading-1',
					label: 'Kop 1',
				},
				{
					kind: 'heading',
					level: 2,
					icon: 'i-lucide-heading-2',
					label: 'Kop 2',
				},
				{
					kind: 'heading',
					level: 3,
					icon: 'i-lucide-heading-3',
					label: 'Kop 3',
				},
			],
		},
	],
	[
		{
			kind: 'mark',
			mark: 'bold',
			icon: 'i-lucide-bold',
			tooltip: { text: 'Dikgedrukt' },
		},
		{
			kind: 'mark',
			mark: 'italic',
			icon: 'i-lucide-italic',
			tooltip: { text: 'Cursief' },
		},
		{
			kind: 'mark',
			mark: 'underline',
			icon: 'i-lucide-underline',
			tooltip: { text: 'Onderstreept' },
		},
		{
			kind: 'mark',
			mark: 'strike',
			icon: 'i-lucide-strikethrough',
			tooltip: { text: 'Doorhalen' },
		},
	],
]

// SSR-safe function to append menus to body (avoids z-index issues in docs)
const appendToBody = import.meta.client ? () => document.body : undefined
</script>

<template>
	<UEditor
		v-slot="{ editor }"
		v-model="model"
		content-type="markdown"
		placeholder="Voeg jouw opmerking toe of typ / voor opties... Je opmerking wordt verwerkt in de rapportage die je kunt genereren."
		class="min-h-21 w-full"
		:autofocus="autofocus"
		:ui="
			outline
				? {
						root: 'bg-white dark:bg-neutral-950',
						base: 'sm:px-12 py-6 border border-muted rounded-md min-h-60',
					}
				: {}
		"
	>
		<UEditorToolbar :editor="editor" :items="tools" layout="bubble">
			<template #link>
				<EditorLinkPopover :editor="editor" />
			</template>
		</UEditorToolbar>
		<UEditorDragHandle :editor="editor" />
		<UEditorSuggestionMenu :editor="editor" :items="suggestions" :append-to="appendToBody" />
	</UEditor>
</template>
