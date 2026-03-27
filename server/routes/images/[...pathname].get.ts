import { createError, eventHandler, getRouterParam } from 'h3'
// @ts-expect-error alias is not added in dev, but it wil exist in prod
import { blob } from 'hub:blob'

export default eventHandler(async (event) => {
	const pathname = getRouterParam(event, 'pathname')

	console.log('pathname')
	if (!pathname) {
		throw createError({ statusCode: 404, statusMessage: 'Not Found' })
	}
	console.log(await blob.list())
	return blob.serve(event, pathname)
})
