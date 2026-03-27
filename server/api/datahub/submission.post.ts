import { DATAHUB_CONFIG } from '@constants'
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

	const url = joinURL(datahubUrl, ...DATAHUB_CONFIG.submissionPathSegments)

	await $fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${datahubToken}`
		},
		body: {
			form_type: DATAHUB_CONFIG.submissionFormType,
			payload: parsedData
		},
		query: {
			fields: [...DATAHUB_CONFIG.responseFields]
		}
	})

	return { success: true }
})
