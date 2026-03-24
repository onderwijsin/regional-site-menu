<script lang="ts" setup></script>

<template>
	<NuxtLayout name="menu">
		<ClientOnly>
			<MenuOverview persist />
			<SuggestionCta />
			<template #fallback>
				<SkeletonMenu />
			</template>
		</ClientOnly>
	</NuxtLayout>
</template>
