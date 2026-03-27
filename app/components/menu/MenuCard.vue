<script lang="ts" setup>
import type { ItemsCollectionItem } from '@nuxt/content'

const props = defineProps<{ item: ItemsCollectionItem }>()

const state = useStateStore()
const { mode } = storeToRefs(state)
const { getScoreColor, getScoreLabel } = useAuditUtils()
const { getIcon } = useIcons()

const score = computed(() => state.getAuditScore(props.item.id))
</script>

<template>
	<UPageCard
		variant="soft"
		:title="item.title"
		:description="item.description"
		:to="item.path"
		:ui="{
			body: mode === 'edit' ? 'pr-4' : '',
			footer: 'space-x-2 space-y-1.5'
		}"
	>
		<template #footer>
			<Pillar :value="item.pillar" size="sm" />
			<Goal v-for="goal in item.goals" :key="goal" :value="goal" size="sm" />
			<ClientOnly>
				<div v-if="mode === 'edit'" class="absolute top-3 right-3 z-50 flex gap-2">
					<UTooltip
						v-if="typeof score === 'number'"
						:delay-duration="0"
						:text="getScoreLabel(score)"
					>
						<div>
							<UChip
								size="2xl"
								standalone
								inset
								:color="getScoreColor(score)"
								class="transition-opacity hover:opacity-80"
							/>
						</div>
					</UTooltip>
					<AuditModal
						:item-id="item.id"
						:item-title="item.title"
						:description="item.audit?.description"
					>
						<template #default>
							<UTooltip
								:delay-duration="300"
								:text="
									typeof score === 'number'
										? `Bewerk beoordeling`
										: 'Voeg beoordeling toe'
								"
							>
								<UButton
									:icon="getIcon('report')"
									aria-label="Voeg beoordeling toe"
									color="neutral"
									variant="subtle"
									size="xs"
								/>
							</UTooltip>
						</template>
					</AuditModal>
				</div>
			</ClientOnly>
		</template>
	</UPageCard>
</template>
