<script lang="ts" setup>
import EditorLinkPopover from './EditorLinkPopover.vue'

withDefaults(
	defineProps<{
		/**
		 * Whether to autofocus on the editor input
		 */
		autofocus?: boolean
		/**
		 * Whether the editor should have an outline style. If false, it's completely naked
		 */
		outline?: boolean
		/**
		 * Placeholder text for the editor
		 */
		placeholder?: string
	}>(),
	{
		placeholder: 'Voeg jouw tekst toe...'
	}
)
const model = defineModel<string>()

const { tools } = useEditorConfig()
</script>

<template>
	<UEditor
		v-slot="{ editor }"
		v-model="model"
		content-type="markdown"
		:placeholder="placeholder"
		class="min-h-21 w-full"
		:autofocus="autofocus"
		:ui="
			outline
				? {
						root: 'bg-white dark:bg-neutral-950',
						base: 'sm:px-12 py-6 border border-muted rounded-md min-h-60'
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
	</UEditor>
</template>
