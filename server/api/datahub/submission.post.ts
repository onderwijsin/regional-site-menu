import { SubmissionSchema } from '@schema/submission'
import { joinURL } from 'ufo'

export default defineEventHandler(async (event) => {
	const body = await readBody(event)
	const parsedData = SubmissionSchema.parse(body)

	const config = useRuntimeConfig(event)
	const url = joinURL(config.datahub.url, 'items', 'submissions')

	await $fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${config.datahub.token}`,
		},
		body: {
			form_type: 'sitemenu_submission',
			payload: parsedData,
		},
		query: {
			fields: ['id'],
		},
	})

	return { success: true }
})
