<script lang="ts" setup>
/**
 * Since this route does not use localStorage persistence, it's safe to use in SSR mode
 * It's main purpose is to provide a single entrypoint where Nitro Prerender can discover
 * routes
 */
</script>

<template>
	<NuxtLayout name="menu">
		<MenuOverview :persist="false" />

		<UPageCTA
			title="Heb je vragen of opmerkingen?"
			description="Laat het ons weten via het contactformulier. We reageren zo snel mogelijk."
			variant="subtle"
			class="my-16"
			:links="[
				{
					label: 'Stuur een bericht',
					to: 'https://www.onderwijsregio.nl/service/contact',
					target: '_blank',
					trailingIcon: 'i-lucide-arrow-right',
					color: 'primary',
				},
			]"
		/>
	</NuxtLayout>
</template>
