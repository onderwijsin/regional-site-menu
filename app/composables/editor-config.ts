import type { EditorSuggestionMenuItem, EditorToolbarItem } from '@nuxt/ui'

/**
 * Factory for editor config
 *
 * Keeps all editor-related config DRY and consistent
 *
 * @returns Suggestion menu and toolbar configuration for the rich-text editor.
 */
export const useEditorConfig = () => {
	const { getIcon } = useIcons()

	// ----------------------
	// Shared definitions
	// ----------------------

	const headings = [1, 2, 3] as const

	const headingItems = headings.map((level) => ({
		kind: 'heading' as const,
		level,
		label: `Kop ${level}`,
		icon: getIcon(`heading${level}` as const)
	}))

	const marks = [
		{ mark: 'bold', label: 'Dikgedrukt', icon: getIcon('bold') },
		{ mark: 'italic', label: 'Cursief', icon: getIcon('italic') },
		{ mark: 'underline', label: 'Onderstreept', icon: getIcon('underline') },
		{ mark: 'strike', label: 'Doorhalen', icon: getIcon('strike') }
	] as const

	// ----------------------
	// Suggestions
	// ----------------------

	const suggestions: EditorSuggestionMenuItem[][] = [
		[
			{ type: 'label', label: 'Tekst' },
			{
				kind: 'paragraph',
				label: 'Paragraaf',
				icon: getIcon('paragraph')
			},
			...headingItems
		],
		[
			{ type: 'label', label: 'Lijsten' },
			{
				kind: 'bulletList',
				label: 'Opsomming',
				icon: getIcon('list')
			},
			{
				kind: 'orderedList',
				label: 'Genummerde lijst',
				icon: getIcon('listOrdered')
			}
		],
		[
			{ type: 'label', label: 'Invoegen' },
			{
				kind: 'blockquote',
				label: 'Citaat',
				icon: getIcon('quote')
			},
			{
				kind: 'horizontalRule',
				label: 'Scheidingslijn',
				icon: getIcon('separator')
			}
		]
	]

	// ----------------------
	// Toolbar
	// ----------------------

	const tools: EditorToolbarItem[][] = [
		[
			{
				kind: 'undo',
				icon: getIcon('undo'),
				tooltip: { text: 'Ongedaan maken' }
			},
			{
				kind: 'redo',
				icon: getIcon('redo'),
				tooltip: { text: 'Opnieuw' }
			}
		],
		[
			{
				icon: getIcon('headings'),
				tooltip: { text: 'Headings' },
				content: { align: 'start' },
				items: headingItems
			}
		],
		[
			...marks.map((m) => ({
				kind: 'mark' as const,
				mark: m.mark,
				icon: m.icon,
				tooltip: { text: m.label }
			}))
		]
	]

	return {
		suggestions,
		tools
	}
}
