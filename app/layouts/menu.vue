<script lang="ts" setup>
const { data: navigation } = await useAsyncData('navigation', () => {
	return queryCollectionNavigation('items')
})

const { staticNavigation } = useMenu()

const route = useRoute()
const isExplorer = computed(() => route.path === '/')
</script>

<template>
	<UContainer>
		<UPage>
			<template #left>
				<UPageAside>
					<UButton
						icon="lucide:layout-dashboard"
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
						class="w-80"
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
