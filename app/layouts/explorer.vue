<script lang="ts" setup>
const { items } = useMenu()
</script>

<template>
	<UContainer>
		<UPage>
			<template #left>
				<UPageAside>
					<p class="font-heading font-bold">Het menu</p>
					<USeparator class="my-3" />
					<UNavigationMenu
						orientation="vertical"
						:items="items"
						class="data-[orientation=vertical]:w-80"
					/>
				</UPageAside>
			</template>

			<slot />
		</UPage>
	</UContainer>
</template>
