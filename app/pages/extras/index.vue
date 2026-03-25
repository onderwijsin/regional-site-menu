<script lang="ts" setup>
const title = "Extra's voor jouw site"
const description =
	'Ontdek inspirerende content, handige tools en slimme integraties voor jouw regionale onderwijsloket.'
useSeoMeta({
	title,
	description,
	ogTitle: title,
	ogDescription: description,
})

// ----------------------
// Deps
// ----------------------
const { getIcon } = useIcons()

// ----------------------
// Data fetching
// ----------------------
const { data } = await useAsyncData(`extras-overview`, () =>
	queryCollection('extras').where('extension', '=', 'md').all(),
)
</script>

<template>
	<NuxtLayout name="menu">
		<UPageHeader
			title="Handige tools en resources"
			headline="Extra's voor jouw site"
			:ui="{
				root: 'pt-2',
				wrapper: 'items-start lg:items-start',
			}"
		>
			<template #description>
				<p class="text-muted my-4 text-lg text-pretty">
					Er is al ontzettend veel ontwikkeld aan inspirerende content, handige tools en
					slimme integraties: zowel binnen als buiten de onderwijsregio's. Veel van deze
					resources kan je (gratis) benutten voor de website van jouw regionale
					onderwijsloket.
				</p>
				<p>
					De inzet van deze <strong><i>extra's</i></strong> is geen doel opzich, maar het
					kan je wel helpen om de verschillende onderdelen in de menukaart makkelijk en
					snel te implementeren.
				</p>
			</template>
		</UPageHeader>

		<UPageList divide class="-mt-12">
			<UPageCard
				v-for="(resource, index) in data"
				:key="index"
				variant="ghost"
				:to="resource.path"
				:ui="{ body: 'flex flex-row items-start gap-4' }"
			>
				<template #body>
					<div
						class="grid size-12 shrink-0 place-items-center rounded-full bg-neutral-100 dark:bg-neutral-950"
					>
						<UIcon :name="getIcon(resource.category)" class="size-4" />
					</div>
					<div class="grow pt-1">
						<h4 class="text-highlighted text-lg font-bold">{{ resource.title }}</h4>
						<p class="text-muted mb-3">{{ resource.description }}</p>
						<div class="space-y-1.5 space-x-2">
							<UBadge
								:label="resource.category"
								color="primary"
								variant="subtle"
								:icon="getIcon(resource.category)"
								:ui="{ leadingIcon: 'size-3', label: 'font-bold' }"
							/>
							<UBadge
								:label="resource.fee"
								color="secondary"
								variant="subtle"
								:icon="getIcon('price')"
								:ui="{ leadingIcon: 'size-3', label: 'font-bold' }"
							/>
						</div>
					</div>
				</template>
			</UPageCard>
		</UPageList>

		<SuggestionCta />
	</NuxtLayout>
</template>
