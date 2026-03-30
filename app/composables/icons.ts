const icons = {
	// State
	warn: 'lucide:message-square-warning',
	success: 'lucide:badge-check',
	error: 'lucide:triangle-alert',

	// Featurtes
	suggestion: 'lucide:circle-fading-plus',
	report: 'lucide:file-badge',
	dashboard: 'lucide:layout-dashboard',
	help: 'lucide:circle-help',
	gift: 'lucide:gift',
	search: 'lucide:search',
	inspiration: 'lucide:lightbulb',
	explore: 'lucide:compass',
	faq: 'lucide:badge-question-mark',

	// Content
	inzicht: 'lucide:component',
	verdieping: 'lucide:scan-text',
	activatie: 'lucide:activity',
	ondersteuning: 'lucide:messages-square',
	goal: 'lucide:goal',
	priority: 'heroicons:fire-16-solid',
	scope: 'lucide:square-dashed-mouse-pointer',

	tool: 'lucide:hammer',
	media: 'lucide:image-play',
	data: 'lucide:database',
	price: 'lucide:euro',

	// Actions
	edit: 'lucide:notebook-pen',
	delete: 'lucide:trash',
	save: 'lucide:save',
	external: 'lucide:external-link',
	url: 'lucide:link',
	refresh: 'lucide:refresh-cw',
	copy: 'lucide:copy',
	copied: 'lucide:copy-check',
	add: 'lucide:plus',
	send: 'lucide:send',
	email: 'lucide:mail',
	download: 'lucide:cloud-download',

	// Editor
	paragraph: 'lucide:type',
	heading1: 'lucide:heading-1',
	heading2: 'lucide:heading-2',
	heading3: 'lucide:heading-3',
	list: 'lucide:list',
	listOrdered: 'lucide:list-ordered',
	quote: 'lucide:text-quote',
	separator: 'lucide:separator-horizontal',

	bold: 'lucide:bold',
	italic: 'lucide:italic',
	underline: 'lucide:underline',
	strike: 'lucide:strikethrough',

	undo: 'lucide:undo',
	redo: 'lucide:redo',
	headings: 'lucide:heading',
	apply: 'lucide:corner-down-left',

	// AI
	chatgpt: 'simple-icons:openai',
	claude: 'simple-icons:anthropic',
	ai: 'hugeicons:artificial-intelligence-04',

	// Misc
	document: 'lucide:file',
	screensize: 'lucide:fullscreen',
	markdown: 'simple-icons:markdown'
}

/**
 * Provides typed access to the project icon registry.
 *
 * @returns Icon resolver by canonical icon key.
 */
export const useIcons = () => {
	function getIcon(name: keyof typeof icons) {
		return icons[name]
	}

	return {
		getIcon
	}
}
