export type RichTextMark = 'bold' | 'italic' | 'underline' | 'strike'

export type RichTextSegment = {
	text: string
	marks: RichTextMark[]
}

export type MarkdownListItem = {
	segments: RichTextSegment[]
	children?: MarkdownBlock[]
}

export type MarkdownBlock =
	| {
			type: 'paragraph'
			segments: RichTextSegment[]
	  }
	| {
			type: 'heading'
			level: 1 | 2 | 3
			segments: RichTextSegment[]
	  }
	| {
			type: 'bulletList'
			items: MarkdownListItem[]
	  }
	| {
			type: 'orderedList'
			items: MarkdownListItem[]
	  }
	| {
			type: 'blockquote'
			blocks: MarkdownBlock[]
	  }
	| {
			type: 'horizontalRule'
	  }

type TiptapMark = {
	type: string
}

export type TiptapNode = {
	type: string
	attrs?: Record<string, unknown>
	content?: TiptapNode[]
	text?: string
	marks?: TiptapMark[]
}

export type TiptapDoc = {
	type: 'doc'
	content?: TiptapNode[]
}
