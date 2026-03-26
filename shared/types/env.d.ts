import type { Mode } from './primitives'

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			/**
			 * Core runtime
			 */
			MODE: Mode
			DEBUG: 'true' | 'false'

			/**
			 * App
			 */
			APP_URL: string

			/**
			 * API
			 */
			API_TOKEN: string
			OPENAI_API_KEY: string
			OPENAI_MODEL?: string

			/**
			 * Cloudflare
			 */
			CLOUDFLARE_ACCOUNT_ID?: string
			CLOUDFLARE_API_TOKEN?: string
			CLOUDFLARE_CACHE_NAMESPACE_ID: string
			CLOUDFLARE_DATABASE_ID: string

			/**
			 * GitHub
			 */
			GH_ORG: string
			GH_REPO: string

			/**
			 * Analytics
			 */
			PLAUSIBLE_DOMAIN: string
			DISABLE_TRACKING?: 'true' | 'false'

			/**
			 * Datahub
			 * Used for handling form submissions
			 */
			DATAHUB_URL: string
			DATAHUB_TOKEN: string
		}
	}
}

export {}
