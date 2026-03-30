import type { AiPromptKey } from '@schema/fields'
import type { H3Event } from 'h3'
import type { MinimarkNode } from 'minimark'

import { queryCollection } from '@nuxt/content/server'

type MarkdownRoot = {
	type?: string
	value?: MinimarkNode[]
}

export type AiSystemPromptKey = AiPromptKey

/**
 * Converts Nuxt Content's markdown AST into plain text prompt content.
 *
 * @param root - Markdown AST returned by content queries.
 * @returns Plain text prompt string.
 */
function markdownRootToText(root: MarkdownRoot | null | undefined): string {
	if (!root || root.type !== 'minimark' || !Array.isArray(root.value)) {
		return ''
	}

	/**
	 * Recursively unwraps minimark nodes into text.
	 *
	 * @param node - Minimark node.
	 * @returns Plain text.
	 */
	const nodeToText = (node: MinimarkNode): string => {
		if (typeof node === 'string') {
			return node
		}

		const [, , ...children] = node
		const childText = children.map((child) => nodeToText(child)).join('')

		// Element boundaries map to new lines so paragraph/list structure is preserved.
		return `${childText}\n`
	}

	return root.value
		.map((node) => nodeToText(node))
		.join('\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim()
}

/**
 * Resolves a system prompt from the Nuxt Content `_prompts` collection.
 *
 * @param event - Current request context.
 * @param key - Stable prompt key.
 * @returns Prompt text.
 */
export async function getAiSystemPrompt(event: H3Event, key: AiSystemPromptKey): Promise<string> {
	const entry = await queryCollection(event, '_prompts')
		.where('extension', '=', 'md')
		.where('key', '=', key)
		.first()

	const prompt = markdownRootToText((entry as { body?: MarkdownRoot } | null)?.body)

	if (!prompt) {
		throw createError({
			statusCode: 500,
			statusMessage: `Prompt not found: ${key}`
		})
	}

	return prompt
}
