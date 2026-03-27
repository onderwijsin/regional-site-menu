<script lang="ts" setup>
import { ASYNC_DATA_KEYS } from '@constants'

const { data: navigation } = await useAsyncData(ASYNC_DATA_KEYS.navigation, () => {
	return queryCollectionNavigation('items')
})

const { staticNavigation } = useMenu()
const { getIcon } = useIcons()

const route = useRoute()
const isExplorer = computed(() => route.path === '/')
</script>

<template>
	<UContainer>
		<UPage>
			<template #left>
				<UPageAside :ui="{ root: 'md:block' }">
					<UButton
						:icon="getIcon('dashboard')"
						variant="ghost"
						label="Het menu"
						:color="isExplorer ? 'primary' : 'neutral'"
						class="-mx-2.5 font-bold"
						to="/"
					/>
					<USeparator class="my-3" />
					<UContentNavigation
						:navigation="navigation"
						highlight
						type="single"
						default-open
					/>
					<USeparator class="mt-4 mb-3" />
					<UNavigationMenu
						orientation="vertical"
						:items="staticNavigation"
						class="-mx-2.5"
					/>
				</UPageAside>
			</template>

			<UPageBody>
				<slot />
			</UPageBody>
		</UPage>
	</UContainer>
</template>
