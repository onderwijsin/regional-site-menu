import type { Mode } from './primitives'

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			/**
			 * Tooling flags
			 */
			DISABLE_PRE_COMMIT_FORMAT?: 'true' | 'false'
			DISABLE_PRE_COMMIT_LINT?: 'true' | 'false'
			DISABLE_PRE_PUSH_TYPECHECK?: 'true' | 'false'
			DISABLE_PRE_PUSH_LINT?: 'true' | 'false'

			/**
			 * Core runtime and mode
			 */
			MODE: Mode
			DEBUG: 'true' | 'false'
			VITEST?: 'true' | 'false'

			/**
			 * App URLs
			 */
			APP_URL: string
			PROD_URL?: string

			/**
			 * API and abuse protection
			 */
			API_TOKEN: string
			TURNSTILE_SITE_KEY?: string
			TURNSTILE_SECRET_KEY?: string

			/**
			 * Cloudflare deployment
			 */
			CLOUDFLARE_ACCOUNT_ID?: string
			CLOUDFLARE_API_TOKEN?: string
			CLOUDFLARE_D1_DATABASE_ID: string
			CLOUDFLARE_CACHE_NAMESPACE_ID: string
			CLOUDFLARE_R2_BUCKET: string
			WORKER_NAME: string

			/**
			 * Storage credentials (R2/S3 compatibility)
			 */
			S3_ACCESS_KEY_ID?: string
			S3_SECRET_ACCESS_KEY?: string
			S3_ENDPOINT?: string
			S3_BUCKET?: string
			S3_PUBLIC_URL?: string

			/**
			 * Analytics
			 */
			PLAUSIBLE_DOMAIN?: string
			DISABLE_TRACKING?: 'true' | 'false'

			/**
			 * OpenAI integration
			 */
			OPENAI_API_KEY: string
			OPENAI_MODEL?: string
			OPENAI_MODEL_WEBSITE_ANALYSIS?: string
			OPENAI_MODEL_BRIEFING?: string

			/**
			 * Datahub
			 * Used for handling form submissions
			 */
			DATAHUB_URL: string
			DATAHUB_TOKEN: string

			/**
			 * Studio auth
			 */
			STUDIO_GITHUB_CLIENT_ID?: string
			STUDIO_GITHUB_CLIENT_SECRET?: string

			/**
			 * Sentry build/runtime configuration
			 */
			SENTRY_AUTH_TOKEN?: string
			SENTRY_PROJECT?: string
			SENTRY_ORG?: string
			SENTRY_DSN?: string
			SENTRY_RELEASE?: string
			SENTRY_UPLOAD_SOURCE_MAPS?: 'true' | 'false'
		}
	}
}

export {}
