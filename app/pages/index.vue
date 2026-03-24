<script lang="ts" setup></script>

<template>
	<NuxtLayout name="menu">
		<ClientOnly>
			<MenuOverview persist />
			<ContactCta />
			<template #fallback>
				<SkeletonMenu />
			</template>
		</ClientOnly>
	</NuxtLayout>
</template>
