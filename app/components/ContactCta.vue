<script lang="ts" setup>
const { contact } = useRuntimeConfig().public
const { getIcon } = useIcons()
</script>

<template>
	<UPageCTA
		title="Heb je vragen of opmerkingen?"
		description="Laat het ons weten via het contactformulier. We reageren zo snel mogelijk."
		variant="subtle"
		class="my-16"
		:links="[
			{
				label: 'Stuur een bericht',
				to: contact.page,
				target: '_blank',
				trailingIcon: getIcon('external'),
				color: 'primary',
			},
		]"
	/>
</template>
