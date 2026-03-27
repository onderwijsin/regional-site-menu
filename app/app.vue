<script setup>
import { nl } from '@nuxt/ui/locale'

useSeoMeta({
	ogImage: '/assets/ogimage.png',
	twitterImage: '/assets/ogimage.png',
	twitterCard: 'summary_large_image'
})

const { mode } = storeToRefs(useStateStore())
const { externalSite } = useMenu()

const { openSuggestion } = useSuggestion()
const { openReport } = useReport()
const { getIcon } = useIcons()
</script>

<template>
	<UApp :toaster="{ expand: false }" :tooltip="{ delayDuration: 250 }" :locale="nl">
		<UHeader :toggle="false" :ui="{ right: 'hidden md:flex' }">
			<template #left>
				<NuxtLink to="/" class="flex items-center gap-2">
					<NuxtImg src="/assets/logo.png" width="40" alt="Onderwijsregio's logo" />
					<span class="text-lg font-bold">Onderwijsregio's</span>
				</NuxtLink>
			</template>

			<template #right>
				<ClientOnly>
					<div class="relative flex items-center gap-4">
						<UTooltip text="Doe een suggestie">
							<UButton
								:icon="getIcon('suggestion')"
								aria-label="Doe een suggestie"
								color="neutral"
								variant="ghost"
								@click="openSuggestion"
							/>
						</UTooltip>
						<AiTools />
						<UColorModeButton />
						<UTooltip
							v-if="mode === 'edit'"
							text="Bekijk je beoordelingen en genereer rapportages"
						>
							<UButton
								:icon="getIcon('report')"
								aria-label="Rapportage"
								color="primary"
								variant="subtle"
								@click="openReport"
							/>
						</UTooltip>
						<ViewMode />
					</div>
				</ClientOnly>
			</template>
		</UHeader>

		<UMain>
			<NuxtPage />
		</UMain>

		<USeparator
			:avatar="{
				src: '/assets/logo.png',
				loading: 'lazy'
			}"
		/>

		<UFooter class="mb-2">
			<template #left>
				<p class="text-muted text-sm">
					Onderwijsregio's • © {{ new Date().getFullYear() }}
				</p>
			</template>

			<template #right>
				<UButton
					aria-label="Onderwijsregio"
					v-bind="externalSite"
					:ui="{ trailingIcon: 'size-4' }"
				/>
			</template>
		</UFooter>
	</UApp>
</template>
