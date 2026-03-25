<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'

const { getIcon } = useIcons()

/**
 * Props for the link popover
 */
const props = defineProps<{
	/** TipTap editor instance */
	editor: Editor

	/** Automatically open popover when link becomes active */
	autoOpen?: boolean
}>()

// ----------------------
// State
// ----------------------

/** Controls popover visibility */
const open = ref(false)

/** Current link URL */
const url = ref('')

// ----------------------
// Derived state
// ----------------------

/**
 * Whether the current selection has an active link mark
 */
const active = computed(() => props.editor.isActive('link'))

/**
 * Whether the link button should be disabled
 *
 * Disabled when:
 * - Editor is not editable
 * - No selection AND no existing link
 */
const disabled = computed(() => {
	if (!props.editor.isEditable) return true

	const { selection } = props.editor.state
	return selection.empty && !props.editor.isActive('link')
})

// ----------------------
// Sync editor → UI state
// ----------------------

/**
 * Keeps local `url` in sync with the editor selection
 */
watch(
	() => props.editor,
	(editor, _, onCleanup) => {
		if (!editor) return

		/**
		 * Extract current link href from selection
		 */
		const updateUrl = () => {
			const { href } = editor.getAttributes('link')
			url.value = href || ''
		}

		updateUrl()

		// Listen to selection changes
		editor.on('selectionUpdate', updateUrl)

		onCleanup(() => {
			editor.off('selectionUpdate', updateUrl)
		})
	},
	{ immediate: true },
)

/**
 * Auto-open popover when a link becomes active
 */
watch(active, (isActive) => {
	if (isActive && props.autoOpen) {
		open.value = true
	}
})

// ----------------------
// Actions
// ----------------------

/**
 * Apply or update a link on the current selection
 *
 * Behavior:
 * - If selection is empty → insert URL as text
 * - If inside code → extend code mark first
 * - Otherwise → extend existing link range
 */
function setLink(): void {
	if (!url.value) return

	const { selection } = props.editor.state
	const isEmpty = selection.empty
	const isCodeActive = props.editor.isActive('code')

	let chain = props.editor.chain().focus()

	// When linking code, extend code mark first (TipTap quirk)
	if (isCodeActive && !isEmpty) {
		chain = chain.extendMarkRange('code').setLink({ href: url.value })
	} else {
		chain = chain.extendMarkRange('link').setLink({ href: url.value })

		// Insert text when no selection exists
		if (isEmpty) {
			chain = chain.insertContent({
				type: 'text',
				text: url.value,
			})
		}
	}

	chain.run()
	open.value = false
}

/**
 * Remove link from current selection
 *
 * Also prevents automatic relinking by TipTap
 */
function removeLink(): void {
	props.editor
		.chain()
		.focus()
		.extendMarkRange('link')
		.unsetLink()
		.setMeta('preventAutolink', true) // stops TipTap from re-adding it
		.run()

	url.value = ''
	open.value = false
}

/**
 * Open the current URL in a new tab
 */
function openLink(): void {
	if (!url.value) return
	window.open(url.value, '_blank', 'noopener,noreferrer')
}

/**
 * Handle keyboard interactions inside input
 *
 * - Enter → apply link
 */
function handleKeyDown(event: KeyboardEvent): void {
	if (event.key === 'Enter') {
		event.preventDefault()
		setLink()
	}
}
</script>

<template>
	<UPopover v-model:open="open" :ui="{ content: 'p-0.5' }">
		<UTooltip text="Link">
			<UButton
				:icon="getIcon('url')"
				color="neutral"
				active-color="primary"
				variant="ghost"
				active-variant="soft"
				size="sm"
				:active="active"
				:disabled="disabled"
			/>
		</UTooltip>

		<template #content>
			<UInput
				v-model="url"
				autofocus
				name="url"
				type="url"
				variant="none"
				placeholder="Paste a link..."
				@keydown="handleKeyDown"
			>
				<div class="mr-0.5 flex items-center">
					<UButton
						:icon="getIcon('apply')"
						variant="ghost"
						size="sm"
						:disabled="!url && !active"
						title="Apply link"
						@click="setLink"
					/>

					<USeparator orientation="vertical" class="mx-1 h-6" />

					<UButton
						:icon="getIcon('external')"
						color="neutral"
						variant="ghost"
						size="sm"
						:disabled="!url && !active"
						title="Open in new window"
						@click="openLink"
					/>

					<UButton
						:icon="getIcon('delete')"
						color="neutral"
						variant="ghost"
						size="sm"
						:disabled="!url && !active"
						title="Remove link"
						@click="removeLink"
					/>
				</div>
			</UInput>
		</template>
	</UPopover>
</template>
