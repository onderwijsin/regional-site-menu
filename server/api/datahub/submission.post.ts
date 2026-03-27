import { SubmissionSchema } from '@schema/submission'
import { joinURL } from 'ufo'

export default defineEventHandler(async (event) => {
	const body = await readBody(event)
	const parsedData = SubmissionSchema.parse(body)

	const config = useRuntimeConfig(event)
	const datahubUrl = config.datahub.url?.trim()
	const datahubToken = config.datahub.token?.trim()

	if (!datahubUrl) {
		throw createError({
			statusCode: 500,
			statusMessage: 'DATAHUB_URL ontbreekt in runtimeConfig'
		})
	}

	if (!datahubToken) {
		throw createError({
			statusCode: 500,
			statusMessage: 'DATAHUB_TOKEN ontbreekt in runtimeConfig'
		})
	}

	const url = joinURL(datahubUrl, 'items', 'submissions')

	await $fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${datahubToken}`
		},
		body: {
			form_type: 'sitemenu_submission',
			payload: parsedData
		},
		query: {
			fields: ['id']
		}
	})

	return { success: true }
})
