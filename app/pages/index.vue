<script lang="ts" setup></script>

<template>
	<NuxtLayout name="menu">
		<ClientOnly>
			<MenuOverview persist />
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
			<template #fallback>
				<SkeletonMenu />
			</template>
		</ClientOnly>
	</NuxtLayout>
</template>
