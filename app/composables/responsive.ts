import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'

/**
 * Composable that exposes Tailwind-based responsive breakpoint helpers.
 *
 * This composable:
 * - Uses {@link useBreakpoints} with {@link breakpointsTailwind}
 * - Provides convenient boolean refs for common viewport ranges
 * - Can be used in templates and scripts to drive responsive behavior
 *
 * Breakpoints are based on Tailwind defaults:
 * - `sm`: ≥ 640px
 * - `md`: ≥ 768px
 * - `lg`: ≥ 1024px
 * - `xl`: ≥ 1280px
 * - `2xl`: ≥ 1536px
 *
 * @returns An object with:
 * - `breakpoints` – The VueUse breakpoints instance for custom queries.
 * - `isXs` – `true` when viewport is smaller than `sm`.
 * - `isSm` – `true` when viewport is `sm` and up.
 * - `isMd` – `true` when viewport is `md` and up.
 * - `isLg` – `true` when viewport is `lg` and up.
 * - `isXl` – `true` when viewport is `xl` and up.
 * - `is2Xl` – `true` when viewport is `2xl` and up.
 *
 * @example
 * ```ts
 * const { isXs, isMd } = useResponsive()
 *
 * const isMobileOnly = computed(() => isXs.value)
 * const isDesktop = computed(() => isMd.value)
 * ```
 *
 * @example
 * ```vue
 * <template>
 *   <div>
 *     <p v-if="isXs">Small screen layout</p>
 *     <p v-else-if="isMd">Desktop layout</p>
 *   </div>
 * </template>
 *
 * <script setup lang="ts">
 * const { isXs, isMd } = useResponsive()
 * </script>
 * ```
 */
export const useResponsive = () => {
	const breakpoints = useBreakpoints(breakpointsTailwind)

	const isXs = breakpoints.smaller('sm')
	const isSm = breakpoints.greaterOrEqual('sm')
	const isMd = breakpoints.greaterOrEqual('md')
	const isLg = breakpoints.greaterOrEqual('lg')
	const isXl = breakpoints.greaterOrEqual('xl')
	const is2Xl = breakpoints.greaterOrEqual('2xl')

	return {
		breakpoints,
		isXs,
		isSm,
		isMd,
		isLg,
		isXl,
		is2Xl
	}
}
