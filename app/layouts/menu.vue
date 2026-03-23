<script lang="ts" setup>
const { data: navigation } = await useAsyncData('navigation', () => {
	return queryCollectionNavigation('items')
})

const { staticNavigation } = useMenu()

const route = useRoute()
const isExplorer = computed(() => route.path === '/explorer')
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
						class="-mx-1.5 font-bold"
						to="/explorer"
					/>
					<USeparator class="my-3" />
					<UContentNavigation
						:navigation="navigation"
						highlight
						type="single"
						default-open
					/>
					<USeparator class="mt-4 mb-3" />
					<UNavigationMenu orientation="vertical" :items="staticNavigation" />
				</UPageAside>
			</template>

			<slot />
		</UPage>
	</UContainer>
</template>
